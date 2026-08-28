import {
    getApps,
    initializeApp,
} from "firebase-admin/app";

import {
    getFirestore,
} from "firebase-admin/firestore";

import {
    HttpsError,
} from "firebase-functions/v2/https";

import {
    calculateScoreHandler,
} from "./calculateScore";

import {
    getActivityForAttempt,
} from "../activities/getActivity";

import {
    awardXPHandler,
} from "../gamification/awardXP";

import {
    awardCoinsHandler,
} from "../gamification/awardCoins";

import {
    updateProgressHandler,
} from "../progress/updateProgress";

process.env.FIRESTORE_EMULATOR_HOST ??=
    "127.0.0.1:8081";

const projectId =
    process.env.GCLOUD_PROJECT
    ?? "eduplay-test";

if (getApps().length === 0) {
    initializeApp({
        projectId,
    });
}

export interface SubmitAttemptData {
    activityId: string;
    studentId: string;
    attemptId?: string;
    groupId?: string;
    answers: Record<string, unknown>;
}

export interface SubmitAttemptAuth {
    uid: string;
}

interface GamificationReward {
    xp: number;
    coins: number;
}

function calculateGamificationReward(
    scorePercentage: number,
): GamificationReward {
    if (scorePercentage >= 100) {
        return {
            xp: 20,
            coins: 10,
        };
    }

    if (scorePercentage >= 80) {
        return {
            xp: 15,
            coins: 7,
        };
    }

    if (scorePercentage >= 60) {
        return {
            xp: 10,
            coins: 5,
        };
    }

    return {
        xp: 5,
        coins: 2,
    };
}

export async function submitAttemptHandler(
    data: SubmitAttemptData,
    auth: SubmitAttemptAuth | null,
) {
    if (!auth) {
        throw new HttpsError(
            "unauthenticated",
            "Debes estar autenticado.",
        );
    }

    const {
        activityId,
        studentId,
        attemptId,
        groupId,
        answers,
    } = data;

    if (
        typeof activityId !== "string"
        || activityId.trim() === ""
        || typeof studentId !== "string"
        || studentId.trim() === ""
        || (
            attemptId !== undefined
            && (
                typeof attemptId !== "string"
                || attemptId.trim() === ""
            )
        )
        || !answers
        || typeof answers !== "object"
        || Array.isArray(answers)
    ) {
        throw new HttpsError(
            "invalid-argument",
            "Datos de intento inválidos.",
        );
    }

    if (auth.uid !== studentId) {
        throw new HttpsError(
            "permission-denied",
            "No puedes enviar un intento para otro estudiante.",
        );
    }

    const db =
        getFirestore();

    const studentReference =
        db
            .collection("users")
            .doc(studentId);

    const studentSnapshot =
        await studentReference.get();

    if (!studentSnapshot.exists) {
        throw new HttpsError(
            "not-found",
            "El estudiante no existe.",
        );
    }

    const {
        activity,
        config,
        answerKey,
    } = await getActivityForAttempt(
        activityId,
    );

    const subjectId =
        activity.subjectId;

    if (
        typeof subjectId !== "string"
        || subjectId.trim() === ""
    ) {
        throw new HttpsError(
            "failed-precondition",
            "La actividad no tiene una materia válida.",
        );
    }

    const pointsByQuestion:
        Record<string, number> = {};

    for (const question of config.questions) {
        pointsByQuestion[question.id] =
            typeof question.points === "number"
                ? question.points
                : 1;
    }

    const score =
        calculateScoreHandler({
            activityId,

            answers,

            answerKey:
                answerKey.answers,

            pointsByQuestion,

            passingScore:
                config.passingScore,
        });

    const scorePercentage =
        score.totalPoints > 0
            ? (
                score.score /
                score.totalPoints
            ) * 100
            : 0;

    const reward =
        calculateGamificationReward(
            scorePercentage,
        );

    /*
     * El attemptId funciona como identificador
     * idempotente del intento.
     */

    const attemptReference =
        attemptId
            ? db
                .collection("attempts")
                .doc(attemptId)
            : db
                .collection("attempts")
                .doc();

    /*
     * =========================================
     * COMPROBACIÓN DE ATTEMPT EXISTENTE
     * =========================================
     */

    const existingAttemptSnapshot =
        await attemptReference.get();

    if (existingAttemptSnapshot.exists) {
        const existingData =
            existingAttemptSnapshot.data() ?? {};

        if (
            existingData.studentId !== studentId
            || existingData.activityId !== activityId
        ) {
            throw new HttpsError(
                "already-exists",
                "El attemptId ya pertenece a otro intento.",
            );
        }

        const existingGamification =
            existingData.gamification ?? {};

        return {
            success: true,

            attemptId:
                attemptReference.id,

            activity: {
                id:
                    activity.id,

                title:
                    activity.title,

                subjectId,
            },

            score:
                existingData.score,

            totalPoints:
                existingData.totalPoints,

            correctAnswers:
                existingData.correctAnswers,

            totalQuestions:
                existingData.totalQuestions,

            passed:
                existingData.passed,

            gamification: {
                scorePercentage:
                    existingGamification.scorePercentage
                    ?? scorePercentage,

                xp:
                    existingGamification.xp
                    ?? 0,

                totalXP:
                    existingGamification.totalXP
                    ?? 0,

                level:
                    existingGamification.level
                    ?? 1,

                coins:
                    existingGamification.coins
                    ?? 0,

                totalCoins:
                    existingGamification.totalCoins
                    ?? 0,

                rewarded:
                    existingGamification.rewarded
                    ?? false,
            },
        };
    }

    /*
     * =========================================
     * CREAR ATTEMPT
     * =========================================
     */

    await attemptReference.create({
        studentId,

        activityId,

        ...(groupId
            ? {
                groupId,
            }
            : {}),

        answers,

        score:
            score.score,

        totalPoints:
            score.totalPoints,

        correctAnswers:
            score.correctAnswers,

        totalQuestions:
            score.totalQuestions,

        passed:
            score.passed,

        answerResults:
            score.answers,

        status:
            "submitted",

        gamification: {
            scorePercentage,

            xp:
                0,

            coins:
                0,

            totalXP:
                0,

            totalCoins:
                0,

            rewarded:
                false,
        },

        createdAt:
            new Date(),
    });

    /*
     * =========================================
     * ACTUALIZAR PROGRESO
     * =========================================
     */

    const progressResult =
        await updateProgressHandler(
            {
                studentId,

                activityId,

                subjectId,

                score:
                    score.score,

                totalPoints:
                    score.totalPoints,

                passed:
                    score.passed,
            },
            {
                uid:
                    studentId,
            },
        );

    /*
     * =========================================
     * ACTIVIDAD YA CONTABILIZADA
     * =========================================
     *
     * El intento se conserva.
     *
     * Pero NO:
     *
     * - suma progreso nuevamente
     * - entrega XP nuevamente
     * - entrega EduCoins nuevamente
     */

    if (!progressResult.counted) {
        await attemptReference.update({
            gamification: {
                scorePercentage,

                xp:
                    0,

                coins:
                    0,

                totalXP:
                    0,

                totalCoins:
                    0,

                rewarded:
                    false,
            },
        });

        return {
            success: true,

            attemptId:
                attemptReference.id,

            activity: {
                id:
                    activity.id,

                title:
                    activity.title,

                subjectId,
            },

            score:
                score.score,

            totalPoints:
                score.totalPoints,

            correctAnswers:
                score.correctAnswers,

            totalQuestions:
                score.totalQuestions,

            passed:
                score.passed,

            gamification: {
                scorePercentage,

                xp:
                    0,

                totalXP:
                    0,

                level:
                    1,

                coins:
                    0,

                totalCoins:
                    0,

                rewarded:
                    false,
            },
        };
    }

    /*
     * =========================================
     * OTORGAR XP
     * =========================================
     */

    const xpResult =
        await awardXPHandler({
            studentId,

            amount:
                reward.xp,

            reason:
                `Actividad completada: ${activity.title}`,
        });

    /*
     * =========================================
     * OTORGAR EDUCOINS
     * =========================================
     */

    const coinsResult =
        await awardCoinsHandler({
            studentId,

            amount:
                reward.coins,

            reason:
                `Actividad completada: ${activity.title}`,
        });

    /*
     * =========================================
     * GUARDAR GAMIFICACIÓN FINAL
     * =========================================
     */

    await attemptReference.update({
        gamification: {
            scorePercentage,

            xp:
                reward.xp,

            totalXP:
                xpResult.totalXP,

            level:
                xpResult.level,

            coins:
                reward.coins,

            totalCoins:
                coinsResult.coins,

            rewarded:
                true,
        },
    });

    /*
     * =========================================
     * RESPUESTA FINAL
     * =========================================
     */

    return {
        success: true,

        attemptId:
            attemptReference.id,

        activity: {
            id:
                activity.id,

            title:
                activity.title,

            subjectId,
        },

        score:
            score.score,

        totalPoints:
            score.totalPoints,

        correctAnswers:
            score.correctAnswers,

        totalQuestions:
            score.totalQuestions,

        passed:
            score.passed,

        gamification: {
            scorePercentage,

            xp:
                reward.xp,

            totalXP:
                xpResult.totalXP,

            level:
                xpResult.level,

            coins:
                reward.coins,

            totalCoins:
                coinsResult.coins,

            rewarded:
                true,
        },
    };
}
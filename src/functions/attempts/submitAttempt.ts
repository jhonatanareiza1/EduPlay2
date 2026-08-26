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

    const studentRef =
        db
            .collection("users")
            .doc(studentId);

    const studentSnap =
        await studentRef.get();

    if (!studentSnap.exists) {
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
     * idempotente de la operación.
     */
    const attemptRef =
        attemptId
            ? db
                .collection("attempts")
                .doc(attemptId)
            : db
                .collection("attempts")
                .doc();

    /*
     * Primero comprobamos si el intento ya existe.
     *
     * Esto debe ocurrir antes de actualizar progreso
     * o entregar recompensas.
     */
    const existingAttemptSnap =
        await attemptRef.get();

    if (existingAttemptSnap.exists) {
        const existingData =
            existingAttemptSnap.data();

        if (
            existingData?.studentId !== studentId
            || existingData?.activityId !== activityId
        ) {
            throw new HttpsError(
                "already-exists",
                "El attemptId ya pertenece a otro intento.",
            );
        }

        const existingGamification =
            existingData?.gamification ?? {};

        return {
            success: true,

            attemptId:
                attemptRef.id,

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
                    ?? reward.xp,

                totalXP:
                    existingGamification.totalXP
                    ?? 0,

                level:
                    existingGamification.level
                    ?? 1,

                coins:
                    existingGamification.coins
                    ?? reward.coins,

                totalCoins:
                    existingGamification.totalCoins
                    ?? 0,
            },
        };
    }

    /*
     * Creamos el intento antes de otorgar
     * recompensas.
     */
    await attemptRef.create({
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
                reward.xp,

            coins:
                reward.coins,

            rewarded:
                false,
        },

        createdAt:
            new Date(),
    });

    /*
     * Actualizamos progreso por materia.
     */
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
     * Otorgamos XP.
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
     * Otorgamos EduCoins.
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
     * Guardamos el resultado final de gamificación.
     */
    await attemptRef.update({
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

    return {
        success: true,

        attemptId:
            attemptRef.id,

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
        },
    };
}

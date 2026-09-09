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

import {
    evaluateAchievementsHandler,
} from "../achievements/evaluateAchievements";

import {
    completeActivityAssignmentHandler,
} from "../assignments/completeActivityAssignment";

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

function getAnswerText(
    answer: string | string[],
    options: Array<{
        id: string;
        text: string;
    }> | undefined,
): string | string[] {
    if (!options || options.length === 0) {
        return answer;
    }

    const getOptionText = (
        optionId: string,
    ): string => {
        const option =
            options.find(
                (item) =>
                    item.id === optionId,
            );

        return option?.text ?? optionId;
    };

    if (Array.isArray(answer)) {
        return answer.map(
            getOptionText,
        );
    }

    return getOptionText(answer);
}

function enrichAnswerResults(
    answers: Array<{
        questionId: string;
        answer: string | string[];
        isCorrect: boolean;
        pointsEarned: number;
        pointsAvailable: number;
    }>,
    questions: Array<{
        id: string;
        type: string;
        text: string;
        options?: Array<{
            id: string;
            text: string;
        }>;
        points?: number;
        explanation?: string;
    }>,
): Array<{
    questionId: string;
    answer: string | string[];
    answerText: string | string[];
    isCorrect: boolean;
    pointsEarned: number;
    pointsAvailable: number;
}> {
    return answers.map(
        (answerResult) => {
            const question =
                questions.find(
                    (item) =>
                        item.id ===
                        answerResult.questionId,
                );

            return {
                ...answerResult,
                answerText:
                    getAnswerText(
                        answerResult.answer,
                        question?.options,
                    ),
            };
        },
    );
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

    const answerResults =
        enrichAnswerResults(
            score.answers,
            config.questions,
        );

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
        answerResults,
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
     * COMPLETAR ASIGNACIONES
     * =========================================
     */
    const assignmentsSnapshot =
        await db
            .collection("activityAssignments")
            .where(
                "activityId",
                "==",
                activityId,
            )
            .get();

    for (
        const assignmentSnapshot
        of assignmentsSnapshot.docs
    ) {
        const assignmentData =
            assignmentSnapshot.data();

        if (
            assignmentData.status !== undefined
            && assignmentData.status !== "assigned"
        ) {
            continue;
        }

        if (
            assignmentData.targetType ===
            "student"
            && assignmentData.targetId ===
            studentId
        ) {
            await completeActivityAssignmentHandler(
                {
                    assignmentId:
                        assignmentSnapshot.id,
                    studentId,
                },
                {
                    uid:
                        studentId,
                },
            );

            continue;
        }

        if (
            assignmentData.targetType ===
            "group"
            && typeof assignmentData.targetId ===
            "string"
        ) {
            const groupMemberSnapshot =
                await db
                    .collection("groupMembers")
                    .where(
                        "groupId",
                        "==",
                        assignmentData.targetId,
                    )
                    .where(
                        "studentId",
                        "==",
                        studentId,
                    )
                    .limit(1)
                    .get();

            if (!groupMemberSnapshot.empty) {
                await completeActivityAssignmentHandler(
                    {
                        assignmentId:
                            assignmentSnapshot.id,
                        studentId,
                    },
                    {
                        uid:
                            studentId,
                    },
                );
            }
        }
    }

    /*
     * =========================================
     * ACTUALIZAR PROGRESO
     * =========================================
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
     * OBTENER ACTIVIDADES COMPLETADAS
     * =========================================
     */
    const progressSnapshot =
        await db
            .collection("progress")
            .doc(studentId)
            .get();

    const progressData =
        progressSnapshot.data() ?? {};

    const activitiesCompleted =
        typeof progressData.activitiesCompleted === "number"
            ? progressData.activitiesCompleted
            : 0;

    /*
     * =========================================
     * EVALUAR ACHIEVEMENTS
     * =========================================
     */
    await evaluateAchievementsHandler(
        {
            studentId,
            passed:
                score.passed,
            scorePercentage,
            activitiesCompleted,
            totalXP:
                xpResult.totalXP,
        },
        {
            uid:
                studentId,
        },
    );

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
        xpAwarded:
            reward.xp,
        coinsAwarded:
            reward.coins,
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
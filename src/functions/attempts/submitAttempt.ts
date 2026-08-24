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
    groupId?: string;
    answers: Record<string, unknown>;
}

export interface SubmitAttemptAuth {
    uid: string;
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
        groupId,
        answers,
    } = data;

    if (
        typeof activityId !== "string"
        || activityId.trim() === ""
        || typeof studentId !== "string"
        || studentId.trim() === ""
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

    const db = getFirestore();

    const studentRef = db
        .collection("students")
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
            answerKey: answerKey.answers,
            pointsByQuestion,
            passingScore:
                config.passingScore,
        });

    const attemptRef = db
        .collection("attempts")
        .doc();

    await attemptRef.create({
        studentId,
        activityId,
        ...(groupId
            ? { groupId }
            : {}),
        answers,
        score: score.score,
        totalPoints: score.totalPoints,
        correctAnswers:
            score.correctAnswers,
        totalQuestions:
            score.totalQuestions,
        passed: score.passed,
        answerResults: score.answers,
        status: "submitted",
        createdAt: new Date(),
    });

    return {
        success: true,
        attemptId: attemptRef.id,
        activity: {
            id: activity.id,
            title: activity.title,
        },
        score: score.score,
        totalPoints: score.totalPoints,
        correctAnswers:
            score.correctAnswers,
        totalQuestions:
            score.totalQuestions,
        passed: score.passed,
    };
}
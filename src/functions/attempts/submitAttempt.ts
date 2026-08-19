import { getApps, initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { HttpsError } from "firebase-functions/v2/https";

process.env.FIRESTORE_EMULATOR_HOST ??= "127.0.0.1:8081";
process.env.GCLOUD_PROJECT ??= "eduplay-test";

if (getApps().length === 0) {
    initializeApp({
        projectId: "eduplay-test",
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
        typeof activityId !== "string" ||
        activityId.trim() === "" ||
        typeof studentId !== "string" ||
        studentId.trim() === "" ||
        !answers ||
        typeof answers !== "object" ||
        Array.isArray(answers)
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

    const activityRef = db
        .collection("activities")
        .doc(activityId);

    const [studentSnap, activitySnap] = await Promise.all([
        studentRef.get(),
        activityRef.get(),
    ]);

    if (!studentSnap.exists) {
        throw new HttpsError(
            "not-found",
            "El estudiante no existe.",
        );
    }

    if (!activitySnap.exists) {
        throw new HttpsError(
            "not-found",
            "La actividad no existe.",
        );
    }

    const attemptRef = db
        .collection("attempts")
        .doc();

    await attemptRef.create({
        studentId,
        activityId,
        ...(groupId ? { groupId } : {}),
        answers,
        status: "submitted",
        createdAt: new Date(),
    });

    return {
        success: true,
        attemptId: attemptRef.id,
    };
}
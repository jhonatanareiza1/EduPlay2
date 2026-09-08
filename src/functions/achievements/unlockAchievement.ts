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

export interface UnlockAchievementData {
    studentId: string;
    achievementId: string;
}

export interface UnlockAchievementAuth {
    uid: string;
}

export interface UnlockAchievementResult {
    studentId: string;
    achievementId: string;
    unlockedBy: string;
}

export async function unlockAchievementHandler(
    data: UnlockAchievementData,
    auth: UnlockAchievementAuth | null,
): Promise<UnlockAchievementResult> {
    if (!auth) {
        throw new HttpsError(
            "unauthenticated",
            "Debes estar autenticado.",
        );
    }

    if (
        !data ||
        typeof data.studentId !== "string" ||
        data.studentId.trim() === ""
    ) {
        throw new HttpsError(
            "invalid-argument",
            "studentId es obligatorio.",
        );
    }

    if (
        typeof data.achievementId !== "string" ||
        data.achievementId.trim() === ""
    ) {
        throw new HttpsError(
            "invalid-argument",
            "achievementId es obligatorio.",
        );
    }

    if (auth.uid !== data.studentId) {
        throw new HttpsError(
            "permission-denied",
            "No puedes desbloquear un logro para otro estudiante.",
        );
    }

    const database = getFirestore();

    const achievementReference = database
        .collection("achievements")
        .doc(data.achievementId);

    const achievementSnapshot =
        await achievementReference.get();

    if (!achievementSnapshot.exists) {
        throw new HttpsError(
            "not-found",
            "El logro no existe.",
        );
    }

    const studentAchievementReference = database
        .collection("studentAchievements")
        .doc(`${data.studentId}_${data.achievementId}`);

    const studentAchievementSnapshot =
        await studentAchievementReference.get();

    if (!studentAchievementSnapshot.exists) {
        await studentAchievementReference.create({
            studentId: data.studentId,
            achievementId: data.achievementId,
            unlockedAt: new Date(),
        });
    }

    return {
        studentId: data.studentId,
        achievementId: data.achievementId,
        unlockedBy: auth.uid,
    };
}

import { HttpsError } from "firebase-functions/v2/https";

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

export function unlockAchievementHandler(
    data: UnlockAchievementData,
    auth: UnlockAchievementAuth | null,
): UnlockAchievementResult {
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

    return {
        studentId: data.studentId,
        achievementId: data.achievementId,
        unlockedBy: auth.uid,
    };
}
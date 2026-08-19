import { HttpsError } from "firebase-functions/v2/https";

export interface UnlockAchievementData {
    studentId: string;
    achievementId: string;
}

export interface UnlockAchievementResult {
    studentId: string;
    achievementId: string;
    unlocked: true;
}

export function unlockAchievementHandler(
    data: UnlockAchievementData,
): UnlockAchievementResult {
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

    return {
        studentId: data.studentId,
        achievementId: data.achievementId,
        unlocked: true,
    };
}
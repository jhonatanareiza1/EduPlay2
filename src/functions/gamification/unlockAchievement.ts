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

export interface UnlockAchievementResult {
    studentId: string;
    achievementId: string;
    unlocked: true;
}

export async function unlockAchievementHandler(
    data: UnlockAchievementData,
): Promise<UnlockAchievementResult> {
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

    const database = getFirestore();

    const profileReference = database
        .collection("gamificationProfiles")
        .doc(data.studentId);

    const profileSnapshot =
        await profileReference.get();

    if (!profileSnapshot.exists) {
        throw new HttpsError(
            "not-found",
            "El perfil de gamificación no existe.",
        );
    }

    const achievementReference =
        profileReference
            .collection("achievements")
            .doc(data.achievementId);

    const achievementSnapshot =
        await achievementReference.get();

    if (!achievementSnapshot.exists) {
        await achievementReference.create({
            achievementId: data.achievementId,
            unlockedAt: new Date(),
        });
    }

    return {
        studentId: data.studentId,
        achievementId: data.achievementId,
        unlocked: true,
    };
}
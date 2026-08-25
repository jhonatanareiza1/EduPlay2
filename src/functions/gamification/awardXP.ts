import { getFirestore } from "firebase-admin/firestore";
import { HttpsError } from "firebase-functions/v2/https";

export interface AwardXPData {
    studentId: string;
    amount: number;
    reason: string;
}

export interface AwardXPResult {
    studentId: string;
    amount: number;
    reason: string;
    totalXP: number;
    level: number;
}

export async function awardXPHandler(
    data: AwardXPData,
): Promise<AwardXPResult> {
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
        typeof data.amount !== "number" ||
        !Number.isFinite(data.amount) ||
        data.amount <= 0
    ) {
        throw new HttpsError(
            "invalid-argument",
            "La cantidad de XP debe ser mayor que cero.",
        );
    }

    if (
        typeof data.reason !== "string" ||
        data.reason.trim() === ""
    ) {
        throw new HttpsError(
            "invalid-argument",
            "El motivo es obligatorio.",
        );
    }

    const database = getFirestore();

    const profileReference = database
        .collection("gamificationProfiles")
        .doc(data.studentId);

    const result = await database.runTransaction(
        async (transaction) => {
            const profileSnapshot =
                await transaction.get(profileReference);

            if (!profileSnapshot.exists) {
                throw new HttpsError(
                    "not-found",
                    "El perfil de gamificación del estudiante no existe.",
                );
            }

            const profileData =
                profileSnapshot.data() ?? {};

            const currentXP =
                typeof profileData.totalXP === "number"
                    ? profileData.totalXP
                    : 0;

            const currentLevel =
                typeof profileData.level === "number"
                    ? profileData.level
                    : 1;

            const newTotalXP =
                currentXP + data.amount;

            const newLevel =
                Math.floor(newTotalXP / 100) + 1;

            const updatedAt = new Date();

            transaction.update(profileReference, {
                totalXP: newTotalXP,
                level: newLevel,
                updatedAt,
            });

            return {
                totalXP: newTotalXP,
                level: newLevel,
                currentLevel,
            };
        },
    );

    return {
        studentId: data.studentId,
        amount: data.amount,
        reason: data.reason,
        totalXP: result.totalXP,
        level: result.level,
    };
}
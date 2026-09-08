import {
    getApps,
    initializeApp,
} from "firebase-admin/app";

import {
    FieldValue,
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

export interface AwardCoinsData {
    studentId: string;
    amount: number;
    reason: string;
}

export interface AwardCoinsResult {
    studentId: string;
    amount: number;
    reason: string;
    coins: number;
}

export async function awardCoinsHandler(
    data: AwardCoinsData,
): Promise<AwardCoinsResult> {
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
            "La cantidad de EduCoins debe ser mayor que cero.",
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

    const transactionReference = database
        .collection("gamificationTransactions")
        .doc();

    const result = await database.runTransaction(
        async (transaction) => {
            const profileSnapshot =
                await transaction.get(profileReference);

            if (!profileSnapshot.exists) {
                throw new HttpsError(
                    "not-found",
                    "El perfil de gamificación no existe.",
                );
            }

            const profileData =
                profileSnapshot.data();

            const currentCoins =
                typeof profileData?.coins === "number"
                    ? profileData.coins
                    : 0;

            const newCoins =
                currentCoins + data.amount;

            transaction.update(
                profileReference,
                {
                    coins: FieldValue.increment(data.amount),
                    updatedAt: new Date(),
                },
            );

            transaction.set(
                transactionReference,
                {
                    studentId: data.studentId,
                    type: "coins",
                    amount: data.amount,
                    reason: data.reason,
                    balanceAfter: newCoins,
                    createdAt: new Date(),
                },
            );

            return newCoins;
        },
    );

    return {
        studentId: data.studentId,
        amount: data.amount,
        reason: data.reason,
        coins: result,
    };
}

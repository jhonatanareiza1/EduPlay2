import { HttpsError } from "firebase-functions/v2/https";

export interface AwardCoinsData {
    studentId: string;
    amount: number;
    reason: string;
}

export interface AwardCoinsResult {
    studentId: string;
    amount: number;
    reason: string;
}

export function awardCoinsHandler(
    data: AwardCoinsData,
): AwardCoinsResult {
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

    return {
        studentId: data.studentId,
        amount: data.amount,
        reason: data.reason,
    };
}
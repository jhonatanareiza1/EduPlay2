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
}

export function awardXPHandler(
    data: AwardXPData,
): AwardXPResult {
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

    return {
        studentId: data.studentId,
        amount: data.amount,
        reason: data.reason,
    };
}
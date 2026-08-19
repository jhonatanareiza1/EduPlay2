import { HttpsError } from "firebase-functions/v2/https";

export interface ApplyAcademicBonusData {
    studentId: string;
    achievementId: string;
    bonus: number;
    reason: string;
}

export interface ApplyAcademicBonusAuth {
    uid: string;
}

export interface ApplyAcademicBonusResult {
    studentId: string;
    achievementId: string;
    bonus: number;
    reason: string;
    appliedBy: string;
}

export function applyAcademicBonusHandler(
    data: ApplyAcademicBonusData,
    auth: ApplyAcademicBonusAuth | null,
): ApplyAcademicBonusResult {
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

    if (
        typeof data.bonus !== "number" ||
        !Number.isFinite(data.bonus) ||
        data.bonus <= 0
    ) {
        throw new HttpsError(
            "invalid-argument",
            "El bonus debe ser un número mayor que 0.",
        );
    }

    if (
        typeof data.reason !== "string" ||
        data.reason.trim() === ""
    ) {
        throw new HttpsError(
            "invalid-argument",
            "El motivo del bonus es obligatorio.",
        );
    }

    return {
        studentId: data.studentId,
        achievementId: data.achievementId,
        bonus: data.bonus,
        reason: data.reason,
        appliedBy: auth.uid,
    };
}
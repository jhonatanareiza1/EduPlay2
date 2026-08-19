import { HttpsError } from "firebase-functions/v2/https";

export interface ModifyGradeData {
    gradeId: string;
    studentId: string;
    grade: number;
    reason: string;
}

export interface ModifyGradeAuth {
    uid: string;
}

export interface ModifyGradeResult {
    gradeId: string;
    studentId: string;
    grade: number;
    reason: string;
    modifiedBy: string;
}

export function modifyGradeHandler(
    data: ModifyGradeData,
    auth: ModifyGradeAuth | null,
): ModifyGradeResult {
    if (!auth) {
        throw new HttpsError(
            "unauthenticated",
            "Debes estar autenticado.",
        );
    }

    if (
        !data ||
        typeof data.gradeId !== "string" ||
        data.gradeId.trim() === ""
    ) {
        throw new HttpsError(
            "invalid-argument",
            "gradeId es obligatorio.",
        );
    }

    if (
        typeof data.studentId !== "string" ||
        data.studentId.trim() === ""
    ) {
        throw new HttpsError(
            "invalid-argument",
            "studentId es obligatorio.",
        );
    }

    if (
        typeof data.grade !== "number" ||
        !Number.isFinite(data.grade) ||
        data.grade < 0 ||
        data.grade > 10
    ) {
        throw new HttpsError(
            "invalid-argument",
            "La calificación debe estar entre 0 y 10.",
        );
    }

    if (
        typeof data.reason !== "string" ||
        data.reason.trim() === ""
    ) {
        throw new HttpsError(
            "invalid-argument",
            "El motivo del cambio es obligatorio.",
        );
    }

    return {
        gradeId: data.gradeId,
        studentId: data.studentId,
        grade: data.grade,
        reason: data.reason,
        modifiedBy: auth.uid,
    };
}
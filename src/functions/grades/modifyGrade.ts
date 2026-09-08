import {
    getApps,
    initializeApp,
} from "firebase-admin/app";

import {
    getFirestore,
} from "firebase-admin/firestore";

import { HttpsError } from "firebase-functions/v2/https";

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

export async function modifyGradeHandler(
    data: ModifyGradeData,
    auth: ModifyGradeAuth | null,
): Promise<ModifyGradeResult> {
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

    const database =
        getFirestore();

    const gradeReference =
        database
            .collection("grades")
            .doc(data.gradeId);

    const result =
        await database.runTransaction(
            async (transaction) => {
                const gradeSnapshot =
                    await transaction.get(
                        gradeReference,
                    );

                if (!gradeSnapshot.exists) {
                    throw new HttpsError(
                        "not-found",
                        "La calificación no existe.",
                    );
                }

                const gradeData =
                    gradeSnapshot.data();

                if (
                    gradeData?.studentId !==
                    data.studentId
                ) {
                    throw new HttpsError(
                        "permission-denied",
                        "La calificación no pertenece al estudiante indicado.",
                    );
                }

                if (
                    gradeData?.teacherId !==
                    auth.uid
                ) {
                    throw new HttpsError(
                        "permission-denied",
                        "No puedes modificar esta calificación.",
                    );
                }

                const previousGrade =
                    typeof gradeData.finalGrade === "number"
                        ? gradeData.finalGrade
                        : gradeData.grade;

                const academicBonus =
                    typeof gradeData.academicBonus === "number"
                        ? gradeData.academicBonus
                        : 0;

                const finalGrade =
                    Math.min(
                        10,
                        data.grade +
                        academicBonus,
                    );

                const gradeChangeReference =
                    database
                        .collection("gradeChanges")
                        .doc();

                transaction.update(
                    gradeReference,
                    {
                        grade:
                            finalGrade,

                        baseGrade:
                            data.grade,

                        finalGrade,

                        updatedAt:
                            new Date(),
                    },
                );

                transaction.create(
                    gradeChangeReference,
                    {
                        gradeId:
                            data.gradeId,

                        studentId:
                            data.studentId,

                        changedBy:
                            auth.uid,

                        previousGrade,

                        newGrade:
                            finalGrade,

                        type:
                            "grade",

                        reason:
                            data.reason,

                        achievementId:
                            null,

                        bonus:
                            0,

                        createdAt:
                            new Date(),
                    },
                );

                return {
                    gradeId:
                        data.gradeId,

                    studentId:
                        data.studentId,

                    grade:
                        finalGrade,

                    reason:
                        data.reason,

                    modifiedBy:
                        auth.uid,
                };
            },
        );

    return result;

}
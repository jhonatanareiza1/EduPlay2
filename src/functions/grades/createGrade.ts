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

import {
    getActivityForAttempt,
} from "../activities/getActivity";

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

export interface CreateGradeData {
    studentId: string;
    teacherId: string;
    activityId: string;
    grade: number;
}

export interface CreateGradeAuth {
    uid: string;
}

export interface CreateGradeResult {
    gradeId: string;
    studentId: string;
    teacherId: string;
    activityId: string;
    subjectId: string;
    grade: number;
    baseGrade: number;
    academicBonus: number;
    finalGrade: number;
}

export async function createGradeHandler(
    data: CreateGradeData,
    auth: CreateGradeAuth | null,
): Promise<CreateGradeResult> {
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
        typeof data.teacherId !== "string" ||
        data.teacherId.trim() === ""
    ) {
        throw new HttpsError(
            "invalid-argument",
            "teacherId es obligatorio.",
        );
    }

    if (
        typeof data.activityId !== "string" ||
        data.activityId.trim() === ""
    ) {
        throw new HttpsError(
            "invalid-argument",
            "activityId es obligatorio.",
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

    if (auth.uid !== data.teacherId) {
        throw new HttpsError(
            "permission-denied",
            "No puedes crear una calificación con otro docente.",
        );
    }

    const database = getFirestore();

    const studentReference =
        database
            .collection("users")
            .doc(data.studentId);

    const studentSnapshot =
        await studentReference.get();

    if (!studentSnapshot.exists) {
        throw new HttpsError(
            "not-found",
            "El estudiante no existe.",
        );
    }

    const {
        activity,
    } = await getActivityForAttempt(
        data.activityId,
    );

    if (
        activity.ownerTeacherId !==
        data.teacherId
    ) {
        throw new HttpsError(
            "permission-denied",
            "El docente no es propietario de esta actividad.",
        );
    }

    const subjectId =
        activity.subjectId;

    if (
        typeof subjectId !== "string" ||
        subjectId.trim() === ""
    ) {
        throw new HttpsError(
            "failed-precondition",
            "La actividad no tiene una materia válida.",
        );
    }

    const gradeReference =
        database
            .collection("grades")
            .doc();

    await gradeReference.create({
        studentId:
            data.studentId,

        teacherId:
            data.teacherId,

        activityId:
            data.activityId,

        subjectId,

        grade:
            data.grade,

        baseGrade:
            data.grade,

        academicBonus:
            0,

        finalGrade:
            data.grade,

        createdAt:
            new Date(),

        updatedAt:
            new Date(),
    });

    return {
        gradeId:
            gradeReference.id,

        studentId:
            data.studentId,

        teacherId:
            data.teacherId,

        activityId:
            data.activityId,

        subjectId,

        grade:
            data.grade,

        baseGrade:
            data.grade,

        academicBonus:
            0,

        finalGrade:
            data.grade,
    };
}
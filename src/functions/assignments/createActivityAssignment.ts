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

export type AssignmentTargetType =
    "student"
    | "group";

export interface CreateActivityAssignmentData {
    activityId: string;
    targetType: AssignmentTargetType;
    targetId: string;
    dueAt?: Date | string | null;
}

export interface CreateActivityAssignmentAuth {
    uid: string;
}

export interface CreateActivityAssignmentResult {
    success: true;
    assignmentId: string;
    activityId: string;
    assignedBy: string;
    targetType: AssignmentTargetType;
    targetId: string;
    dueAt: Date | null;
}

export async function createActivityAssignmentHandler(
    data: CreateActivityAssignmentData,
    auth: CreateActivityAssignmentAuth | null,
): Promise<CreateActivityAssignmentResult> {
    if (!auth) {
        throw new HttpsError(
            "unauthenticated",
            "Debes estar autenticado.",
        );
    }

    if (
        typeof data?.activityId !== "string"
        || data.activityId.trim() === ""
        || (
            data.targetType !== "student"
            && data.targetType !== "group"
        )
        || typeof data.targetId !== "string"
        || data.targetId.trim() === ""
    ) {
        throw new HttpsError(
            "invalid-argument",
            "Datos de asignación inválidos.",
        );
    }

    const db =
        getFirestore();

    const teacherReference =
        db
            .collection("users")
            .doc(auth.uid);

    const teacherSnapshot =
        await teacherReference.get();

    if (!teacherSnapshot.exists) {
        throw new HttpsError(
            "not-found",
            "El usuario docente no existe.",
        );
    }

    const teacherData =
        teacherSnapshot.data() ?? {};

    if (teacherData.role !== "teacher") {
        throw new HttpsError(
            "permission-denied",
            "Solo los docentes pueden crear asignaciones.",
        );
    }

    const activityReference =
        db
            .collection("activities")
            .doc(data.activityId);

    const activitySnapshot =
        await activityReference.get();

    if (!activitySnapshot.exists) {
        throw new HttpsError(
            "not-found",
            "La actividad no existe.",
        );
    }

    const targetCollection =
        data.targetType === "student"
            ? "students"
            : "groups";

    const targetReference =
        db
            .collection(targetCollection)
            .doc(data.targetId);

    const targetSnapshot =
        await targetReference.get();

    if (!targetSnapshot.exists) {
        throw new HttpsError(
            "not-found",
            data.targetType === "student"
                ? "El estudiante no existe."
                : "El grupo no existe.",
        );
    }

    let dueAt: Date | null = null;

    if (data.dueAt !== undefined && data.dueAt !== null) {
        if (data.dueAt instanceof Date) {
            if (Number.isNaN(data.dueAt.getTime())) {
                throw new HttpsError(
                    "invalid-argument",
                    "La fecha límite no es válida.",
                );
            }

            dueAt =
                data.dueAt;
        } else if (typeof data.dueAt === "string") {
            const parsedDate =
                new Date(data.dueAt);

            if (Number.isNaN(parsedDate.getTime())) {
                throw new HttpsError(
                    "invalid-argument",
                    "La fecha límite no es válida.",
                );
            }

            dueAt =
                parsedDate;
        } else {
            throw new HttpsError(
                "invalid-argument",
                "La fecha límite no es válida.",
            );
        }
    }

    const assignmentReference =
        db
            .collection("activityAssignments")
            .doc();

    await assignmentReference.create({
        activityId:
            data.activityId,
        assignedBy:
            auth.uid,
        targetType:
            data.targetType,
        targetId:
            data.targetId,
        ...(dueAt
            ? {
                dueAt,
            }
            : {}),
        status:
            "assigned",
        createdAt:
            new Date(),
    });

    return {
        success: true,
        assignmentId:
            assignmentReference.id,
        activityId:
            data.activityId,
        assignedBy:
            auth.uid,
        targetType:
            data.targetType,
        targetId:
            data.targetId,
        dueAt,
    };
}
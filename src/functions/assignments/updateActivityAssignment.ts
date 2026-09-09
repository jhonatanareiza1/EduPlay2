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

export type ActivityAssignmentStatus =
    "assigned"
    | "cancelled";

export interface UpdateActivityAssignmentData {
    assignmentId: string;
    dueAt?: Date | string | null;
    status?: ActivityAssignmentStatus;
}

export interface UpdateActivityAssignmentAuth {
    uid: string;
}

export interface UpdateActivityAssignmentResult {
    success: true;
    assignmentId: string;
    dueAt: Date | null;
    status: ActivityAssignmentStatus;
}

function toDate(
    value: unknown,
): Date | null {
    if (
        value
        && typeof value === "object"
        && "toDate" in value
        && typeof value.toDate === "function"
    ) {
        return value.toDate();
    }

    if (value instanceof Date) {
        return value;
    }

    return null;
}

export async function updateActivityAssignmentHandler(
    data: UpdateActivityAssignmentData,
    auth: UpdateActivityAssignmentAuth | null,
): Promise<UpdateActivityAssignmentResult> {
    if (!auth) {
        throw new HttpsError(
            "unauthenticated",
            "Debes estar autenticado.",
        );
    }

    if (
        !data
        || typeof data.assignmentId !== "string"
        || data.assignmentId.trim() === ""
    ) {
        throw new HttpsError(
            "invalid-argument",
            "assignmentId es obligatorio.",
        );
    }

    if (
        data.status !== undefined
        && data.status !== "assigned"
        && data.status !== "cancelled"
    ) {
        throw new HttpsError(
            "invalid-argument",
            "El estado de la asignación no es válido.",
        );
    }

    let dueAt: Date | null | undefined;

    if (data.dueAt !== undefined) {
        if (data.dueAt === null) {
            dueAt = null;
        } else if (data.dueAt instanceof Date) {
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

    if (
        data.dueAt === undefined
        && data.status === undefined
    ) {
        throw new HttpsError(
            "invalid-argument",
            "Debes indicar al menos un campo para actualizar.",
        );
    }

    const db =
        getFirestore();

    const assignmentReference =
        db
            .collection("activityAssignments")
            .doc(data.assignmentId);

    const assignmentSnapshot =
        await assignmentReference.get();

    if (!assignmentSnapshot.exists) {
        throw new HttpsError(
            "not-found",
            "La asignación no existe.",
        );
    }

    const assignmentData =
        assignmentSnapshot.data() ?? {};

    if (
        assignmentData.assignedBy !==
        auth.uid
    ) {
        throw new HttpsError(
            "permission-denied",
            "No puedes modificar esta asignación.",
        );
    }

    const currentStatus =
        assignmentData.status === "cancelled"
            ? "cancelled"
            : "assigned";

    const updateData: {
        dueAt?: Date | null;
        status?: ActivityAssignmentStatus;
        updatedAt: Date;
    } = {
        updatedAt:
            new Date(),
    };

    if (data.dueAt !== undefined) {
        updateData.dueAt =
            dueAt ?? null;
    }

    if (data.status !== undefined) {
        updateData.status =
            data.status;
    }

    await assignmentReference.update(
        updateData,
    );

    return {
        success: true,
        assignmentId:
            data.assignmentId,
        dueAt:
            data.dueAt !== undefined
                ? dueAt ?? null
                : toDate(
                    assignmentData.dueAt,
                ),
        status:
            data.status
            ?? currentStatus,
    };
}

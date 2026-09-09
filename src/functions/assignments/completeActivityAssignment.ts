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

export interface CompleteActivityAssignmentData {
    assignmentId: string;
    studentId: string;
}

export interface CompleteActivityAssignmentAuth {
    uid: string;
}

export interface CompleteActivityAssignmentResult {
    success: true;
    assignmentId: string;
    studentId: string;
    status: "completed";
    completedAt: Date;
}

export async function completeActivityAssignmentHandler(
    data: CompleteActivityAssignmentData,
    auth: CompleteActivityAssignmentAuth | null,
): Promise<CompleteActivityAssignmentResult> {
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
        || typeof data.studentId !== "string"
        || data.studentId.trim() === ""
    ) {
        throw new HttpsError(
            "invalid-argument",
            "Datos de asignación inválidos.",
        );
    }

    if (auth.uid !== data.studentId) {
        throw new HttpsError(
            "permission-denied",
            "No puedes completar una asignación en nombre de otro estudiante.",
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
        assignmentData.status !== undefined
        && assignmentData.status !== "assigned"
    ) {
        throw new HttpsError(
            "failed-precondition",
            "La asignación no está disponible para completar.",
        );
    }

    const studentReference =
        db
            .collection("students")
            .doc(data.studentId);

    const studentSnapshot =
        await studentReference.get();

    if (!studentSnapshot.exists) {
        throw new HttpsError(
            "not-found",
            "El estudiante no existe.",
        );
    }

    let canComplete =
        assignmentData.targetType === "student"
        && assignmentData.targetId === data.studentId;

    if (
        !canComplete
        && assignmentData.targetType === "group"
        && typeof assignmentData.targetId === "string"
    ) {
        const groupMemberSnapshot =
            await db
                .collection("groupMembers")
                .where(
                    "groupId",
                    "==",
                    assignmentData.targetId,
                )
                .where(
                    "studentId",
                    "==",
                    data.studentId,
                )
                .limit(1)
                .get();

        canComplete =
            !groupMemberSnapshot.empty;
    }

    if (!canComplete) {
        throw new HttpsError(
            "permission-denied",
            "No puedes completar esta asignación.",
        );
    }

    const completedAt =
        new Date();

    await assignmentReference.update({
        status:
            "completed",
        completedAt,
        completedBy:
            data.studentId,
        updatedAt:
            completedAt,
    });

    return {
        success: true,
        assignmentId:
            data.assignmentId,
        studentId:
            data.studentId,
        status:
            "completed",
        completedAt,
    };
}

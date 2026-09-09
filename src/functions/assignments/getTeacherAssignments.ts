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

export interface GetTeacherAssignmentsData { }

export interface GetTeacherAssignmentsAuth {
    uid: string;
}

export interface TeacherAssignment {
    id: string;
    activityId: string;
    assignedBy: string;
    targetType: "student" | "group";
    targetId: string;
    dueAt: Date | null;
    status: string;
    createdAt: Date | null;
}

export interface GetTeacherAssignmentsResult {
    success: true;
    assignments: TeacherAssignment[];
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

export async function getTeacherAssignmentsHandler(
    data: GetTeacherAssignmentsData,
    auth: GetTeacherAssignmentsAuth | null,
): Promise<GetTeacherAssignmentsResult> {
    if (!auth) {
        throw new HttpsError(
            "unauthenticated",
            "Debes estar autenticado.",
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
            "Solo los docentes pueden consultar sus asignaciones.",
        );
    }

    const assignmentsSnapshot =
        await db
            .collection("activityAssignments")
            .where(
                "assignedBy",
                "==",
                auth.uid,
            )
            .get();

    const assignments: TeacherAssignment[] =
        assignmentsSnapshot.docs.map(
            (assignmentSnapshot) => {
                const assignmentData =
                    assignmentSnapshot.data();

                return {
                    id:
                        assignmentSnapshot.id,
                    activityId:
                        assignmentData.activityId,
                    assignedBy:
                        assignmentData.assignedBy,
                    targetType:
                        assignmentData.targetType,
                    targetId:
                        assignmentData.targetId,
                    dueAt:
                        toDate(
                            assignmentData.dueAt,
                        ),
                    status:
                        typeof assignmentData.status ===
                            "string"
                            ? assignmentData.status
                            : "assigned",
                    createdAt:
                        toDate(
                            assignmentData.createdAt,
                        ),
                };
            },
        );

    assignments.sort(
        (a, b) => {
            if (
                a.createdAt === null
                && b.createdAt === null
            ) {
                return 0;
            }

            if (a.createdAt === null) {
                return 1;
            }

            if (b.createdAt === null) {
                return -1;
            }

            return (
                b.createdAt.getTime()
                - a.createdAt.getTime()
            );
        },
    );

    return {
        success: true,
        assignments,
    };
}

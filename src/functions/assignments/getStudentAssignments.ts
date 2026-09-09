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

export interface GetStudentAssignmentsData {
    studentId: string;
}

export interface GetStudentAssignmentsAuth {
    uid: string;
}

export interface StudentAssignment {
    id: string;
    activityId: string;
    assignedBy: string;
    targetType: "student" | "group";
    targetId: string;
    dueAt: Date | null;
    status: string;
    createdAt: Date | null;
}

export interface GetStudentAssignmentsResult {
    success: true;
    assignments: StudentAssignment[];
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

export async function getStudentAssignmentsHandler(
    data: GetStudentAssignmentsData,
    auth: GetStudentAssignmentsAuth | null,
): Promise<GetStudentAssignmentsResult> {
    if (!auth) {
        throw new HttpsError(
            "unauthenticated",
            "Debes estar autenticado.",
        );
    }

    if (
        !data
        || typeof data.studentId !== "string"
        || data.studentId.trim() === ""
    ) {
        throw new HttpsError(
            "invalid-argument",
            "studentId es obligatorio.",
        );
    }

    if (auth.uid !== data.studentId) {
        throw new HttpsError(
            "permission-denied",
            "No puedes consultar las asignaciones de otro estudiante.",
        );
    }

    const db =
        getFirestore();

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

    const assignmentsSnapshot =
        await db
            .collection("activityAssignments")
            .get();

    const assignments: StudentAssignment[] = [];

    const studentGroupIds =
        new Set<string>();

    const groupMembersSnapshot =
        await db
            .collection("groupMembers")
            .where(
                "studentId",
                "==",
                data.studentId,
            )
            .get();

    for (
        const groupMember
        of groupMembersSnapshot.docs
    ) {
        const groupMemberData =
            groupMember.data();

        if (
            typeof groupMemberData.groupId ===
            "string"
            && groupMemberData.groupId.trim() !== ""
        ) {
            studentGroupIds.add(
                groupMemberData.groupId,
            );
        }
    }

    for (
        const assignmentSnapshot
        of assignmentsSnapshot.docs
    ) {
        const assignmentData =
            assignmentSnapshot.data();

        if (
            assignmentData.targetType !==
            "student"
            && assignmentData.targetType !==
            "group"
        ) {
            continue;
        }

        const matchesStudent =
            assignmentData.targetType ===
            "student"
            && assignmentData.targetId ===
            data.studentId;

        const matchesGroup =
            assignmentData.targetType ===
            "group"
            && typeof assignmentData.targetId ===
            "string"
            && studentGroupIds.has(
                assignmentData.targetId,
            );

        if (
            !matchesStudent
            && !matchesGroup
        ) {
            continue;
        }

        assignments.push({
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
        });
    }

    assignments.sort(
        (a, b) => {
            if (
                a.dueAt === null
                && b.dueAt === null
            ) {
                return 0;
            }

            if (a.dueAt === null) {
                return 1;
            }

            if (b.dueAt === null) {
                return -1;
            }

            return (
                a.dueAt.getTime()
                - b.dueAt.getTime()
            );
        },
    );

    return {
        success: true,
        assignments,
    };
}
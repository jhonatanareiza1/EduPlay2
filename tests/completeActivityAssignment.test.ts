import {
    beforeAll,
    beforeEach,
    describe,
    expect,
    it,
} from "vitest";

import {
    getFirestore,
} from "firebase-admin/firestore";

import {
    completeActivityAssignmentHandler,
} from "../src/functions/assignments/completeActivityAssignment";

describe(
    "completeActivityAssignmentHandler",
    () => {
        const db =
            getFirestore();

        const teacherId =
            "teacher-complete-assignment-test";

        const studentId =
            "student-complete-assignment-test";

        const otherStudentId =
            "other-student-complete-assignment-test";

        const groupId =
            "group-complete-assignment-test";

        const otherGroupId =
            "other-group-complete-assignment-test";

        const assignmentId =
            "complete-assignment-test";

        const groupAssignmentId =
            "complete-group-assignment-test";

        beforeAll(
            async () => {
                await db
                    .collection("users")
                    .doc(teacherId)
                    .set({
                        role:
                            "teacher",
                    });

                await db
                    .collection("students")
                    .doc(studentId)
                    .set({
                        userId:
                            studentId,
                    });

                await db
                    .collection("students")
                    .doc(otherStudentId)
                    .set({
                        userId:
                            otherStudentId,
                    });

                await db
                    .collection("groups")
                    .doc(groupId)
                    .set({
                        name:
                            "Grupo de prueba",
                    });

                await db
                    .collection("groups")
                    .doc(otherGroupId)
                    .set({
                        name:
                            "Otro grupo",
                    });

                await db
                    .collection("groupMembers")
                    .doc(
                        `${groupId} -${studentId}`,
                    )
                    .set({
                        groupId,
                        studentId,
                    });
            },
            30000,
        );

        beforeEach(
            async () => {
                const assignmentsSnapshot =
                    await db
                        .collection(
                            "activityAssignments",
                        )
                        .get();

                await Promise.all(
                    assignmentsSnapshot.docs.map(
                        (assignment) =>
                            assignment.ref.delete(),
                    ),
                );

                await db
                    .collection(
                        "activityAssignments",
                    )
                    .doc(assignmentId)
                    .set({
                        activityId:
                            "activity-complete-test",
                        assignedBy:
                            teacherId,
                        targetType:
                            "student",
                        targetId:
                            studentId,
                        status:
                            "assigned",
                        createdAt:
                            new Date(),
                    });
            },
        );

        it(
            "completa una asignación directa del estudiante",
            async () => {
                const result =
                    await completeActivityAssignmentHandler(
                        {
                            assignmentId,
                            studentId,
                        },
                        {
                            uid:
                                studentId,
                        },
                    );

                expect(
                    result.success,
                ).toBe(true);

                expect(
                    result.assignmentId,
                ).toBe(assignmentId);

                expect(
                    result.studentId,
                ).toBe(studentId);

                expect(
                    result.status,
                ).toBe("completed");

                expect(
                    result.completedAt,
                ).toBeInstanceOf(Date);

                const snapshot =
                    await db
                        .collection(
                            "activityAssignments",
                        )
                        .doc(assignmentId)
                        .get();

                expect(
                    snapshot.data(),
                ).toMatchObject({
                    status:
                        "completed",
                    completedBy:
                        studentId,
                });

                expect(
                    snapshot.data()?.completedAt
                        .toDate(),
                ).toEqual(
                    result.completedAt,
                );
            },
        );

        it(
            "completa una asignación dirigida al grupo del estudiante",
            async () => {
                await db
                    .collection(
                        "activityAssignments",
                    )
                    .doc(groupAssignmentId)
                    .set({
                        activityId:
                            "group-activity-complete-test",
                        assignedBy:
                            teacherId,
                        targetType:
                            "group",
                        targetId:
                            groupId,
                        status:
                            "assigned",
                        createdAt:
                            new Date(),
                    });

                const result =
                    await completeActivityAssignmentHandler(
                        {
                            assignmentId:
                                groupAssignmentId,
                            studentId,
                        },
                        {
                            uid:
                                studentId,
                        },
                    );

                expect(
                    result.success,
                ).toBe(true);

                expect(
                    result.status,
                ).toBe("completed");

                const snapshot =
                    await db
                        .collection(
                            "activityAssignments",
                        )
                        .doc(groupAssignmentId)
                        .get();

                expect(
                    snapshot.data()?.status,
                ).toBe("completed");
            },
        );

        it(
            "rechaza usuarios no autenticados",
            async () => {
                await expect(
                    completeActivityAssignmentHandler(
                        {
                            assignmentId,
                            studentId,
                        },
                        null,
                    ),
                ).rejects.toMatchObject({
                    code:
                        "unauthenticated",
                });
            },
        );

        it(
            "impide completar una asignación en nombre de otro estudiante",
            async () => {
                await expect(
                    completeActivityAssignmentHandler(
                        {
                            assignmentId,
                            studentId:
                                otherStudentId,
                        },
                        {
                            uid:
                                studentId,
                        },
                    ),
                ).rejects.toMatchObject({
                    code:
                        "permission-denied",
                });
            },
        );

        it(
            "impide completar una asignación dirigida a otro estudiante",
            async () => {
                await expect(
                    completeActivityAssignmentHandler(
                        {
                            assignmentId,
                            studentId:
                                otherStudentId,
                        },
                        {
                            uid:
                                otherStudentId,
                        },
                    ),
                ).rejects.toMatchObject({
                    code:
                        "permission-denied",
                });
            },
        );

        it(
            "impide completar una asignación de otro grupo",
            async () => {
                await db
                    .collection(
                        "activityAssignments",
                    )
                    .doc(groupAssignmentId)
                    .set({
                        activityId:
                            "other-group-activity-test",
                        assignedBy:
                            teacherId,
                        targetType:
                            "group",
                        targetId:
                            otherGroupId,
                        status:
                            "assigned",
                        createdAt:
                            new Date(),
                    });

                await expect(
                    completeActivityAssignmentHandler(
                        {
                            assignmentId:
                                groupAssignmentId,
                            studentId,
                        },
                        {
                            uid:
                                studentId,
                        },
                    ),
                ).rejects.toMatchObject({
                    code:
                        "permission-denied",
                });
            },
        );

        it(
            "rechaza una asignación inexistente",
            async () => {
                await expect(
                    completeActivityAssignmentHandler(
                        {
                            assignmentId:
                                "assignment-inexistent",
                            studentId,
                        },
                        {
                            uid:
                                studentId,
                        },
                    ),
                ).rejects.toMatchObject({
                    code:
                        "not-found",
                });
            },
        );

        it(
            "rechaza un estudiante inexistente",
            async () => {
                await expect(
                    completeActivityAssignmentHandler(
                        {
                            assignmentId,
                            studentId:
                                "student-inexistent",
                        },
                        {
                            uid:
                                "student-inexistent",
                        },
                    ),
                ).rejects.toMatchObject({
                    code:
                        "not-found",
                });
            },
        );

        it(
            "rechaza datos inválidos",
            async () => {
                await expect(
                    completeActivityAssignmentHandler(
                        {
                            assignmentId:
                                "",
                            studentId,
                        },
                        {
                            uid:
                                studentId,
                        },
                    ),
                ).rejects.toMatchObject({
                    code:
                        "invalid-argument",
                });

                await expect(
                    completeActivityAssignmentHandler(
                        {
                            assignmentId,
                            studentId:
                                "",
                        },
                        {
                            uid:
                                studentId,
                        },
                    ),
                ).rejects.toMatchObject({
                    code:
                        "invalid-argument",
                });
            },
        );

        it(
            "rechaza una asignación ya completada",
            async () => {
                await db
                    .collection(
                        "activityAssignments",
                    )
                    .doc(assignmentId)
                    .update({
                        status:
                            "completed",
                        completedAt:
                            new Date(),
                    });

                await expect(
                    completeActivityAssignmentHandler(
                        {
                            assignmentId,
                            studentId,
                        },
                        {
                            uid:
                                studentId,
                        },
                    ),
                ).rejects.toMatchObject({
                    code:
                        "failed-precondition",
                });
            },
        );

        it(
            "rechaza una asignación cancelada",
            async () => {
                await db
                    .collection(
                        "activityAssignments",
                    )
                    .doc(assignmentId)
                    .update({
                        status:
                            "cancelled",
                    });

                await expect(
                    completeActivityAssignmentHandler(
                        {
                            assignmentId,
                            studentId,
                        },
                        {
                            uid:
                                studentId,
                        },
                    ),
                ).rejects.toMatchObject({
                    code:
                        "failed-precondition",
                });
            },
        );
    },
);

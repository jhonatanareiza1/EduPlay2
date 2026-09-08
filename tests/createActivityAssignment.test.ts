import {
    beforeEach,
    describe,
    expect,
    it,
} from "vitest";

import {
    getFirestore,
} from "firebase-admin/firestore";

import {
    createActivityAssignmentHandler,
} from "../src/functions/assignments/createActivityAssignment";

describe(
    "createActivityAssignmentHandler",
    () => {
        const db =
            getFirestore();

        const teacherId =
            "teacher-assignment-test";

        const studentId =
            "student-assignment-test";

        const groupId =
            "group-assignment-test";

        const activityId =
            "activity-assignment-test";

        beforeEach(
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
                    .collection("groups")
                    .doc(groupId)
                    .set({
                        name:
                            "Grupo de prueba",
                    });

                await db
                    .collection("activities")
                    .doc(activityId)
                    .set({
                        title:
                            "Actividad de prueba",
                        subjectId:
                            "english",
                    });
            },
        );

        it(
            "crea una asignación para un estudiante",
            async () => {
                const result =
                    await createActivityAssignmentHandler(
                        {
                            activityId,
                            targetType:
                                "student",
                            targetId:
                                studentId,
                        },
                        {
                            uid:
                                teacherId,
                        },
                    );

                expect(
                    result.success,
                ).toBe(true);

                expect(
                    result.assignmentId,
                ).toBeTruthy();

                expect(
                    result.activityId,
                ).toBe(activityId);

                expect(
                    result.assignedBy,
                ).toBe(teacherId);

                expect(
                    result.targetType,
                ).toBe("student");

                expect(
                    result.targetId,
                ).toBe(studentId);

                expect(
                    result.dueAt,
                ).toBeNull();

                const assignmentSnapshot =
                    await db
                        .collection(
                            "activityAssignments",
                        )
                        .doc(
                            result.assignmentId,
                        )
                        .get();

                expect(
                    assignmentSnapshot.exists,
                ).toBe(true);

                expect(
                    assignmentSnapshot.data(),
                ).toMatchObject({
                    activityId,
                    assignedBy:
                        teacherId,
                    targetType:
                        "student",
                    targetId:
                        studentId,
                    status:
                        "assigned",
                });
            },
        );

        it(
            "crea una asignación para un grupo",
            async () => {
                const result =
                    await createActivityAssignmentHandler(
                        {
                            activityId,
                            targetType:
                                "group",
                            targetId:
                                groupId,
                        },
                        {
                            uid:
                                teacherId,
                        },
                    );

                expect(
                    result.success,
                ).toBe(true);

                expect(
                    result.targetType,
                ).toBe("group");

                expect(
                    result.targetId,
                ).toBe(groupId);

                const assignmentSnapshot =
                    await db
                        .collection(
                            "activityAssignments",
                        )
                        .doc(
                            result.assignmentId,
                        )
                        .get();

                expect(
                    assignmentSnapshot.exists,
                ).toBe(true);
            },
        );

        it(
            "rechaza usuarios no autenticados",
            async () => {
                await expect(
                    createActivityAssignmentHandler(
                        {
                            activityId,
                            targetType:
                                "student",
                            targetId:
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
            "rechaza usuarios que no son docentes",
            async () => {
                await db
                    .collection("users")
                    .doc("regular-user")
                    .set({
                        role:
                            "student",
                    });

                await expect(
                    createActivityAssignmentHandler(
                        {
                            activityId,
                            targetType:
                                "student",
                            targetId:
                                studentId,
                        },
                        {
                            uid:
                                "regular-user",
                        },
                    ),
                ).rejects.toMatchObject({
                    code:
                        "permission-denied",
                });
            },
        );

        it(
            "rechaza una actividad inexistente",
            async () => {
                await expect(
                    createActivityAssignmentHandler(
                        {
                            activityId:
                                "activity-inexistent",
                            targetType:
                                "student",
                            targetId:
                                studentId,
                        },
                        {
                            uid:
                                teacherId,
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
                    createActivityAssignmentHandler(
                        {
                            activityId,
                            targetType:
                                "student",
                            targetId:
                                "student-inexistent",
                        },
                        {
                            uid:
                                teacherId,
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
                    createActivityAssignmentHandler(
                        {
                            activityId:
                                "",
                            targetType:
                                "student",
                            targetId:
                                studentId,
                        },
                        {
                            uid:
                                teacherId,
                        },
                    ),
                ).rejects.toMatchObject({
                    code:
                        "invalid-argument",
                });
            },
        );

        it(
            "guarda una fecha límite válida",
            async () => {
                const dueAt =
                    "2026-10-01T18:00:00.000Z";

                const expectedDueAt =
                    new Date(dueAt);

                const result =
                    await createActivityAssignmentHandler(
                        {
                            activityId,
                            targetType:
                                "student",
                            targetId:
                                studentId,
                            dueAt,
                        },
                        {
                            uid:
                                teacherId,
                        },
                    );

                expect(
                    result.dueAt,
                ).toEqual(
                    expectedDueAt,
                );

                const assignmentSnapshot =
                    await db
                        .collection(
                            "activityAssignments",
                        )
                        .doc(
                            result.assignmentId,
                        )
                        .get();

                const storedDueAt =
                    assignmentSnapshot.data()
                        ?.dueAt;

                expect(
                    storedDueAt?.toDate(),
                ).toEqual(
                    expectedDueAt,
                );
            },
        );
    },
);
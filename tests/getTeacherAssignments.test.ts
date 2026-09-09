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
    getTeacherAssignmentsHandler,
} from "../src/functions/assignments/getTeacherAssignments";

describe(
    "getTeacherAssignmentsHandler",
    () => {
        const db =
            getFirestore();

        const teacherId =
            "teacher-list-assignment-test";

        const otherTeacherId =
            "other-teacher-list-assignment-test";

        const studentId =
            "student-list-assignment-test";

        const groupId =
            "group-list-assignment-test";

        const activityId =
            "activity-list-assignment-test";

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
                    .collection("users")
                    .doc(otherTeacherId)
                    .set({
                        role:
                            "teacher",
                    });

                await db
                    .collection("users")
                    .doc("student-list-assignment-user")
                    .set({
                        role:
                            "student",
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
            },
        );

        it(
            "devuelve las asignaciones creadas por el docente",
            async () => {
                await db
                    .collection(
                        "activityAssignments",
                    )
                    .doc("teacher-assignment")
                    .set({
                        activityId,
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

                const result =
                    await getTeacherAssignmentsHandler(
                        {},
                        {
                            uid:
                                teacherId,
                        },
                    );

                expect(
                    result.success,
                ).toBe(true);

                expect(
                    result.assignments,
                ).toHaveLength(1);

                expect(
                    result.assignments[0],
                ).toMatchObject({
                    id:
                        "teacher-assignment",
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
            "devuelve asignaciones dirigidas a estudiantes y grupos",
            async () => {
                await db
                    .collection(
                        "activityAssignments",
                    )
                    .doc("student-assignment")
                    .set({
                        activityId,
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

                await db
                    .collection(
                        "activityAssignments",
                    )
                    .doc("group-assignment")
                    .set({
                        activityId,
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
                    await getTeacherAssignmentsHandler(
                        {},
                        {
                            uid:
                                teacherId,
                        },
                    );

                expect(
                    result.assignments,
                ).toHaveLength(2);

                expect(
                    result.assignments.map(
                        (assignment) =>
                            assignment.id,
                    ),
                ).toEqual(
                    expect.arrayContaining([
                        "student-assignment",
                        "group-assignment",
                    ]),
                );
            },
        );

        it(
            "no devuelve asignaciones creadas por otro docente",
            async () => {
                await db
                    .collection(
                        "activityAssignments",
                    )
                    .doc("other-teacher-assignment")
                    .set({
                        activityId,
                        assignedBy:
                            otherTeacherId,
                        targetType:
                            "student",
                        targetId:
                            studentId,
                        status:
                            "assigned",
                        createdAt:
                            new Date(),
                    });

                const result =
                    await getTeacherAssignmentsHandler(
                        {},
                        {
                            uid:
                                teacherId,
                        },
                    );

                expect(
                    result.assignments,
                ).toHaveLength(0);
            },
        );

        it(
            "rechaza usuarios no autenticados",
            async () => {
                await expect(
                    getTeacherAssignmentsHandler(
                        {},
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
                await expect(
                    getTeacherAssignmentsHandler(
                        {},
                        {
                            uid:
                                "student-list-assignment-user",
                        },
                    ),
                ).rejects.toMatchObject({
                    code:
                        "permission-denied",
                });
            },
        );

        it(
            "rechaza un usuario inexistente",
            async () => {
                await expect(
                    getTeacherAssignmentsHandler(
                        {},
                        {
                            uid:
                                "teacher-inexistent",
                        },
                    ),
                ).rejects.toMatchObject({
                    code:
                        "not-found",
                });
            },
        );

        it(
            "ordena las asignaciones por fecha de creación descendente",
            async () => {
                await db
                    .collection(
                        "activityAssignments",
                    )
                    .doc("older-assignment")
                    .set({
                        activityId,
                        assignedBy:
                            teacherId,
                        targetType:
                            "student",
                        targetId:
                            studentId,
                        status:
                            "assigned",
                        createdAt:
                            new Date(
                                "2026-09-01T10:00:00.000Z",
                            ),
                    });

                await db
                    .collection(
                        "activityAssignments",
                    )
                    .doc("newer-assignment")
                    .set({
                        activityId,
                        assignedBy:
                            teacherId,
                        targetType:
                            "group",
                        targetId:
                            groupId,
                        status:
                            "assigned",
                        createdAt:
                            new Date(
                                "2026-09-05T10:00:00.000Z",
                            ),
                    });

                const result =
                    await getTeacherAssignmentsHandler(
                        {},
                        {
                            uid:
                                teacherId,
                        },
                    );

                expect(
                    result.assignments.map(
                        (assignment) =>
                            assignment.id,
                    ),
                ).toEqual([
                    "newer-assignment",
                    "older-assignment",
                ]);
            },
        );

        it(
            "convierte correctamente la fecha límite",
            async () => {
                const dueAt =
                    new Date(
                        "2026-10-01T18:00:00.000Z",
                    );

                await db
                    .collection(
                        "activityAssignments",
                    )
                    .doc("due-date-assignment")
                    .set({
                        activityId,
                        assignedBy:
                            teacherId,
                        targetType:
                            "student",
                        targetId:
                            studentId,
                        dueAt,
                        status:
                            "assigned",
                        createdAt:
                            new Date(),
                    });

                const result =
                    await getTeacherAssignmentsHandler(
                        {},
                        {
                            uid:
                                teacherId,
                        },
                    );

                expect(
                    result.assignments[0].dueAt,
                ).toEqual(dueAt);
            },
        );
    },
);

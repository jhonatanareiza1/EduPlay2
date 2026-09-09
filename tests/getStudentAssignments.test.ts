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
    getStudentAssignmentsHandler,
} from "../src/functions/assignments/getStudentAssignments";

describe(
    "getStudentAssignmentsHandler",
    () => {
        const db =
            getFirestore();

        const teacherId =
            "teacher-get-assignment-test";

        const studentId =
            "student-get-assignment-test";

        const otherStudentId =
            "other-student-get-assignment-test";

        const groupId =
            "group-get-assignment-test";

        const otherGroupId =
            "other-group-get-assignment-test";

        const directActivityId =
            "direct-activity-test";

        const groupActivityId =
            "group-activity-test";

        const otherStudentActivityId =
            "other-student-activity-test";

        const otherGroupActivityId =
            "other-group-activity-test";

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

                await db
                    .collection("activities")
                    .doc(directActivityId)
                    .set({
                        title:
                            "Actividad directa",
                        subjectId:
                            "english",
                    });

                await db
                    .collection("activities")
                    .doc(groupActivityId)
                    .set({
                        title:
                            "Actividad de grupo",
                        subjectId:
                            "english",
                    });

                await db
                    .collection("activities")
                    .doc(otherStudentActivityId)
                    .set({
                        title:
                            "Actividad de otro estudiante",
                        subjectId:
                            "english",
                    });

                await db
                    .collection("activities")
                    .doc(otherGroupActivityId)
                    .set({
                        title:
                            "Actividad de otro grupo",
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
            "devuelve una asignación directa al estudiante",
            async () => {
                await db
                    .collection(
                        "activityAssignments",
                    )
                    .doc("direct-assignment")
                    .set({
                        activityId:
                            directActivityId,
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
                    await getStudentAssignmentsHandler(
                        {
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
                    result.assignments,
                ).toHaveLength(1);

                expect(
                    result.assignments[0],
                ).toMatchObject({
                    id:
                        "direct-assignment",
                    activityId:
                        directActivityId,
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
            "devuelve una asignación dirigida al grupo del estudiante",
            async () => {
                await db
                    .collection(
                        "activityAssignments",
                    )
                    .doc("group-assignment")
                    .set({
                        activityId:
                            groupActivityId,
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
                    await getStudentAssignmentsHandler(
                        {
                            studentId,
                        },
                        {
                            uid:
                                studentId,
                        },
                    );

                expect(
                    result.assignments,
                ).toHaveLength(1);

                expect(
                    result.assignments[0],
                ).toMatchObject({
                    id:
                        "group-assignment",
                    activityId:
                        groupActivityId,
                    targetType:
                        "group",
                    targetId:
                        groupId,
                });
            },
        );

        it(
            "no devuelve asignaciones dirigidas a otro estudiante",
            async () => {
                await db
                    .collection(
                        "activityAssignments",
                    )
                    .doc(
                        "other-student-assignment",
                    )
                    .set({
                        activityId:
                            otherStudentActivityId,
                        assignedBy:
                            teacherId,
                        targetType:
                            "student",
                        targetId:
                            otherStudentId,
                        status:
                            "assigned",
                        createdAt:
                            new Date(),
                    });

                const result =
                    await getStudentAssignmentsHandler(
                        {
                            studentId,
                        },
                        {
                            uid:
                                studentId,
                        },
                    );

                expect(
                    result.assignments,
                ).toHaveLength(0);
            },
        );

        it(
            "no devuelve asignaciones dirigidas a otro grupo",
            async () => {
                await db
                    .collection(
                        "activityAssignments",
                    )
                    .doc(
                        "other-group-assignment",
                    )
                    .set({
                        activityId:
                            otherGroupActivityId,
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

                const result =
                    await getStudentAssignmentsHandler(
                        {
                            studentId,
                        },
                        {
                            uid:
                                studentId,
                        },
                    );

                expect(
                    result.assignments,
                ).toHaveLength(0);
            },
        );

        it(
            "devuelve asignaciones directas y de grupo",
            async () => {
                await db
                    .collection(
                        "activityAssignments",
                    )
                    .doc("combined-direct")
                    .set({
                        activityId:
                            directActivityId,
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
                    .doc("combined-group")
                    .set({
                        activityId:
                            groupActivityId,
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
                    await getStudentAssignmentsHandler(
                        {
                            studentId,
                        },
                        {
                            uid:
                                studentId,
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
                        "combined-direct",
                        "combined-group",
                    ]),
                );
            },
        );

        it(
            "rechaza usuarios no autenticados",
            async () => {
                await expect(
                    getStudentAssignmentsHandler(
                        {
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
            "impide consultar las asignaciones de otro estudiante",
            async () => {
                await expect(
                    getStudentAssignmentsHandler(
                        {
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
            "rechaza un estudiante inexistente",
            async () => {
                await expect(
                    getStudentAssignmentsHandler(
                        {
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
            "ordena las asignaciones por fecha límite",
            async () => {
                await db
                    .collection(
                        "activityAssignments",
                    )
                    .doc("later-assignment")
                    .set({
                        activityId:
                            directActivityId,
                        assignedBy:
                            teacherId,
                        targetType:
                            "student",
                        targetId:
                            studentId,
                        dueAt:
                            new Date(
                                "2026-10-20T18:00:00.000Z",
                            ),
                        status:
                            "assigned",
                        createdAt:
                            new Date(),
                    });

                await db
                    .collection(
                        "activityAssignments",
                    )
                    .doc("earlier-assignment")
                    .set({
                        activityId:
                            groupActivityId,
                        assignedBy:
                            teacherId,
                        targetType:
                            "group",
                        targetId:
                            groupId,
                        dueAt:
                            new Date(
                                "2026-10-10T18:00:00.000Z",
                            ),
                        status:
                            "assigned",
                        createdAt:
                            new Date(),
                    });

                const result =
                    await getStudentAssignmentsHandler(
                        {
                            studentId,
                        },
                        {
                            uid:
                                studentId,
                        },
                    );

                expect(
                    result.assignments.map(
                        (assignment) =>
                            assignment.id,
                    ),
                ).toEqual([
                    "earlier-assignment",
                    "later-assignment",
                ]);
            },
        );

        it(
            "coloca las asignaciones sin fecha después de las que tienen fecha",
            async () => {
                await db
                    .collection(
                        "activityAssignments",
                    )
                    .doc("without-due-date")
                    .set({
                        activityId:
                            directActivityId,
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
                    .doc("with-due-date")
                    .set({
                        activityId:
                            groupActivityId,
                        assignedBy:
                            teacherId,
                        targetType:
                            "group",
                        targetId:
                            groupId,
                        dueAt:
                            new Date(
                                "2026-10-10T18:00:00.000Z",
                            ),
                        status:
                            "assigned",
                        createdAt:
                            new Date(),
                    });

                const result =
                    await getStudentAssignmentsHandler(
                        {
                            studentId,
                        },
                        {
                            uid:
                                studentId,
                        },
                    );

                expect(
                    result.assignments.map(
                        (assignment) =>
                            assignment.id,
                    ),
                ).toEqual([
                    "with-due-date",
                    "without-due-date",
                ]);
            },
        );
    },
);

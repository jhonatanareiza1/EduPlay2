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
    updateActivityAssignmentHandler,
} from "../src/functions/assignments/updateActivityAssignment";

describe(
    "updateActivityAssignmentHandler",
    () => {
        const db =
            getFirestore();

        const teacherId =
            "teacher-update-assignment-test";

        const otherTeacherId =
            "other-teacher-update-assignment-test";

        const assignmentId =
            "update-assignment-test";

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
                            "activity-update-test",
                        assignedBy:
                            teacherId,
                        targetType:
                            "student",
                        targetId:
                            "student-update-test",
                        status:
                            "assigned",
                        dueAt:
                            new Date(
                                "2026-10-01T18:00:00.000Z",
                            ),
                        createdAt:
                            new Date(),
                    });
            },
        );

        it(
            "actualiza la fecha límite",
            async () => {
                const dueAt =
                    new Date(
                        "2026-10-15T18:00:00.000Z",
                    );

                const result =
                    await updateActivityAssignmentHandler(
                        {
                            assignmentId,
                            dueAt,
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
                ).toBe(assignmentId);

                expect(
                    result.dueAt,
                ).toEqual(dueAt);

                expect(
                    result.status,
                ).toBe("assigned");

                const snapshot =
                    await db
                        .collection(
                            "activityAssignments",
                        )
                        .doc(assignmentId)
                        .get();

                expect(
                    snapshot.data()?.dueAt.toDate(),
                ).toEqual(dueAt);
            },
        );

        it(
            "permite eliminar la fecha límite",
            async () => {
                const result =
                    await updateActivityAssignmentHandler(
                        {
                            assignmentId,
                            dueAt:
                                null,
                        },
                        {
                            uid:
                                teacherId,
                        },
                    );

                expect(
                    result.dueAt,
                ).toBeNull();

                const snapshot =
                    await db
                        .collection(
                            "activityAssignments",
                        )
                        .doc(assignmentId)
                        .get();

                expect(
                    snapshot.data()?.dueAt,
                ).toBeNull();
            },
        );

        it(
            "actualiza el estado",
            async () => {
                const result =
                    await updateActivityAssignmentHandler(
                        {
                            assignmentId,
                            status:
                                "cancelled",
                        },
                        {
                            uid:
                                teacherId,
                        },
                    );

                expect(
                    result.status,
                ).toBe("cancelled");

                const snapshot =
                    await db
                        .collection(
                            "activityAssignments",
                        )
                        .doc(assignmentId)
                        .get();

                expect(
                    snapshot.data()?.status,
                ).toBe("cancelled");
            },
        );

        it(
            "actualiza fecha y estado simultáneamente",
            async () => {
                const dueAt =
                    new Date(
                        "2026-11-01T18:00:00.000Z",
                    );

                const result =
                    await updateActivityAssignmentHandler(
                        {
                            assignmentId,
                            dueAt,
                            status:
                                "cancelled",
                        },
                        {
                            uid:
                                teacherId,
                        },
                    );

                expect(
                    result.dueAt,
                ).toEqual(dueAt);

                expect(
                    result.status,
                ).toBe("cancelled");

                const snapshot =
                    await db
                        .collection(
                            "activityAssignments",
                        )
                        .doc(assignmentId)
                        .get();

                expect(
                    snapshot.data()?.dueAt.toDate(),
                ).toEqual(dueAt);

                expect(
                    snapshot.data()?.status,
                ).toBe("cancelled");
            },
        );

        it(
            "rechaza usuarios no autenticados",
            async () => {
                await expect(
                    updateActivityAssignmentHandler(
                        {
                            assignmentId,
                            status:
                                "cancelled",
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
            "rechaza un usuario que no es el docente creador",
            async () => {
                await expect(
                    updateActivityAssignmentHandler(
                        {
                            assignmentId,
                            status:
                                "cancelled",
                        },
                        {
                            uid:
                                otherTeacherId,
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
                    updateActivityAssignmentHandler(
                        {
                            assignmentId:
                                "assignment-inexistent",
                            status:
                                "cancelled",
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
                    updateActivityAssignmentHandler(
                        {
                            assignmentId:
                                "",
                            status:
                                "cancelled",
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

                await expect(
                    updateActivityAssignmentHandler(
                        {
                            assignmentId,
                            status:
                                "invalid" as "assigned",
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
            "rechaza una actualización sin campos",
            async () => {
                await expect(
                    updateActivityAssignmentHandler(
                        {
                            assignmentId,
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
            "rechaza una fecha límite inválida",
            async () => {
                await expect(
                    updateActivityAssignmentHandler(
                        {
                            assignmentId,
                            dueAt:
                                "fecha-invalida",
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
    },
);

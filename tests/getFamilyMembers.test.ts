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
    getFamilyMembersHandler,
} from "../src/functions/families/getFamilyMembers";

describe(
    "getFamilyMembersHandler",
    () => {
        const db =
            getFirestore();

        beforeEach(
            async () => {
                await db.recursiveDelete(
                    db.collection("users"),
                );

                await db.recursiveDelete(
                    db.collection("families"),
                );

                await db.recursiveDelete(
                    db.collection("familyMembers"),
                );
            },
        );

        it(
            "rechaza una solicitud sin autenticación",
            async () => {
                await expect(
                    getFamilyMembersHandler(
                        {
                            familyId:
                                "family-test-001",
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
            "rechaza familyId vacío",
            async () => {
                await expect(
                    getFamilyMembersHandler(
                        {
                            familyId:
                                "",
                        },
                        {
                            uid:
                                "parent-test-001",
                        },
                    ),
                ).rejects.toMatchObject({
                    code:
                        "invalid-argument",
                });
            },
        );

        it(
            "rechaza si la familia no existe",
            async () => {
                await expect(
                    getFamilyMembersHandler(
                        {
                            familyId:
                                "family-test-001",
                        },
                        {
                            uid:
                                "parent-test-001",
                        },
                    ),
                ).rejects.toMatchObject({
                    code:
                        "not-found",
                });
            },
        );

        it(
            "rechaza a un usuario que no pertenece a la familia",
            async () => {
                await db
                    .collection("families")
                    .doc("family-test-001")
                    .set({
                        name:
                            "Familia Test",
                        ownerUserId:
                            "parent-owner-001",
                    });

                await expect(
                    getFamilyMembersHandler(
                        {
                            familyId:
                                "family-test-001",
                        },
                        {
                            uid:
                                "parent-other-001",
                        },
                    ),
                ).rejects.toMatchObject({
                    code:
                        "permission-denied",
                });
            },
        );

        it(
            "permite al propietario consultar los miembros",
            async () => {
                await db
                    .collection("families")
                    .doc("family-test-001")
                    .set({
                        name:
                            "Familia Test",
                        ownerUserId:
                            "parent-owner-001",
                    });

                await db
                    .collection("familyMembers")
                    .doc(
                        "family-test-001_parent-owner-001",
                    )
                    .set({
                        familyId:
                            "family-test-001",
                        userId:
                            "parent-owner-001",
                        role:
                            "parent",
                        status:
                            "active",
                    });

                await db
                    .collection("familyMembers")
                    .doc(
                        "family-test-001_student-001",
                    )
                    .set({
                        familyId:
                            "family-test-001",
                        userId:
                            "student-001",
                        role:
                            "child",
                        status:
                            "active",
                    });

                const result =
                    await getFamilyMembersHandler(
                        {
                            familyId:
                                "family-test-001",
                        },
                        {
                            uid:
                                "parent-owner-001",
                        },
                    );

                expect(result.success).toBe(true);
                expect(result.familyId).toBe(
                    "family-test-001",
                );
                expect(result.members).toHaveLength(2);

                expect(
                    result.members,
                ).toEqual(
                    expect.arrayContaining([
                        expect.objectContaining({
                            id:
                                "family-test-001_parent-owner-001",
                            familyId:
                                "family-test-001",
                            userId:
                                "parent-owner-001",
                            role:
                                "parent",
                            status:
                                "active",
                        }),
                        expect.objectContaining({
                            id:
                                "family-test-001_student-001",
                            familyId:
                                "family-test-001",
                            userId:
                                "student-001",
                            role:
                                "child",
                            status:
                                "active",
                        }),
                    ]),
                );
            },
        );

        it(
            "permite a un miembro consultar los miembros",
            async () => {
                await db
                    .collection("families")
                    .doc("family-test-001")
                    .set({
                        name:
                            "Familia Test",
                        ownerUserId:
                            "parent-owner-001",
                    });

                await db
                    .collection("familyMembers")
                    .doc(
                        "family-test-001_parent-owner-001",
                    )
                    .set({
                        familyId:
                            "family-test-001",
                        userId:
                            "parent-owner-001",
                        role:
                            "parent",
                        status:
                            "active",
                    });

                await db
                    .collection("familyMembers")
                    .doc(
                        "family-test-001_student-001",
                    )
                    .set({
                        familyId:
                            "family-test-001",
                        userId:
                            "student-001",
                        role:
                            "child",
                        status:
                            "active",
                    });

                const result =
                    await getFamilyMembersHandler(
                        {
                            familyId:
                                "family-test-001",
                        },
                        {
                            uid:
                                "student-001",
                        },
                    );

                expect(result.success).toBe(true);
                expect(result.members).toHaveLength(2);
            },
        );
    },
);
import {
    beforeAll,
    describe,
    expect,
    it,
} from "vitest";

import {
    getFirestore,
} from "firebase-admin/firestore";

import {
    deleteFamilyHandler,
} from "../src/functions/families/deleteFamily";

describe(
    "deleteFamilyHandler integration",
    () => {
        const db =
            getFirestore();

        beforeAll(
            async () => {
                await db
                    .collection("families")
                    .doc("family-delete-001")
                    .set({
                        name:
                            "Familia para eliminar",
                        ownerUserId:
                            "parent-delete-001",
                        createdAt:
                            new Date(),
                        updatedAt:
                            new Date(),
                    });

                await db
                    .collection("familyMembers")
                    .doc(
                        "family-delete-001_parent-delete-001",
                    )
                    .set({
                        familyId:
                            "family-delete-001",
                        userId:
                            "parent-delete-001",
                        role:
                            "parent",
                        status:
                            "active",
                        createdAt:
                            new Date(),
                        updatedAt:
                            new Date(),
                    });

                await db
                    .collection("familyMembers")
                    .doc(
                        "family-delete-001_child-001",
                    )
                    .set({
                        familyId:
                            "family-delete-001",
                        userId:
                            "child-delete-001",
                        role:
                            "child",
                        status:
                            "active",
                        createdAt:
                            new Date(),
                        updatedAt:
                            new Date(),
                    });
            },
        );

        it(
            "elimina la familia y sus miembros desde Firestore Emulator",
            async () => {
                const result =
                    await deleteFamilyHandler(
                        {
                            familyId:
                                "family-delete-001",
                        },
                        {
                            uid:
                                "parent-delete-001",
                        },
                    );

                expect(
                    result,
                ).toEqual({
                    success:
                        true,
                    familyId:
                        "family-delete-001",
                });

                const familySnapshot =
                    await db
                        .collection("families")
                        .doc(
                            "family-delete-001",
                        )
                        .get();

                expect(
                    familySnapshot.exists,
                ).toBe(false);

                const membersSnapshot =
                    await db
                        .collection("familyMembers")
                        .where(
                            "familyId",
                            "==",
                            "family-delete-001",
                        )
                        .get();

                expect(
                    membersSnapshot.empty,
                ).toBe(true);
            },
        );
    },
);
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
    deleteFamilyHandler,
} from "../src/functions/families/deleteFamily";

describe(
    "deleteFamilyHandler",
    () => {
        const db =
            getFirestore();

        beforeEach(
            async () => {
                const collections = [
                    "families",
                    "familyMembers",
                ];

                for (
                    const collectionName
                    of collections
                ) {
                    const snapshot =
                        await db
                            .collection(collectionName)
                            .get();

                    for (
                        const document
                        of snapshot.docs
                    ) {
                        await document.ref.delete();
                    }
                }
            },
        );

        it(
            "rechaza una solicitud sin autenticación",
            async () => {
                await expect(
                    deleteFamilyHandler(
                        {
                            familyId:
                                "family-001",
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
                    deleteFamilyHandler(
                        {
                            familyId:
                                "",
                        },
                        {
                            uid:
                                "parent-001",
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
                    deleteFamilyHandler(
                        {
                            familyId:
                                "family-001",
                        },
                        {
                            uid:
                                "parent-001",
                        },
                    ),
                ).rejects.toMatchObject({
                    code:
                        "not-found",
                });
            },
        );

        it(
            "rechaza a un usuario que no es propietario",
            async () => {
                await db
                    .collection("families")
                    .doc("family-001")
                    .set({
                        name:
                            "Familia original",
                        ownerUserId:
                            "parent-owner",
                        createdAt:
                            new Date(),
                        updatedAt:
                            new Date(),
                    });

                await expect(
                    deleteFamilyHandler(
                        {
                            familyId:
                                "family-001",
                        },
                        {
                            uid:
                                "parent-other",
                        },
                    ),
                ).rejects.toMatchObject({
                    code:
                        "permission-denied",
                });

                const snapshot =
                    await db
                        .collection("families")
                        .doc("family-001")
                        .get();

                expect(
                    snapshot.exists,
                ).toBe(true);
            },
        );

        it(
            "elimina la familia y sus miembros cuando lo solicita el propietario",
            async () => {
                await db
                    .collection("families")
                    .doc("family-001")
                    .set({
                        name:
                            "Familia original",
                        ownerUserId:
                            "parent-owner",
                        createdAt:
                            new Date(),
                        updatedAt:
                            new Date(),
                    });

                await db
                    .collection("familyMembers")
                    .doc(
                        "family-001_parent-owner",
                    )
                    .set({
                        familyId:
                            "family-001",
                        userId:
                            "parent-owner",
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
                        "family-001_child-001",
                    )
                    .set({
                        familyId:
                            "family-001",
                        userId:
                            "child-001",
                        role:
                            "child",
                        status:
                            "active",
                        createdAt:
                            new Date(),
                        updatedAt:
                            new Date(),
                    });

                const result =
                    await deleteFamilyHandler(
                        {
                            familyId:
                                "family-001",
                        },
                        {
                            uid:
                                "parent-owner",
                        },
                    );

                expect(
                    result,
                ).toEqual({
                    success:
                        true,
                    familyId:
                        "family-001",
                });

                const familySnapshot =
                    await db
                        .collection("families")
                        .doc("family-001")
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
                            "family-001",
                        )
                        .get();

                expect(
                    membersSnapshot.empty,
                ).toBe(true);
            },
        );
    },
);
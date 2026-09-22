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
    updateFamilyHandler,
} from "../src/functions/families/updateFamily";

describe(
    "updateFamilyHandler",
    () => {
        const db =
            getFirestore();

        beforeEach(
            async () => {
                const collections = [
                    "families",
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
                    updateFamilyHandler(
                        {
                            familyId:
                                "family-001",
                            name:
                                "Familia nueva",
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
                    updateFamilyHandler(
                        {
                            familyId:
                                "",
                            name:
                                "Familia nueva",
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
            "rechaza un nombre vacío",
            async () => {
                await expect(
                    updateFamilyHandler(
                        {
                            familyId:
                                "family-001",
                            name:
                                "   ",
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
                    updateFamilyHandler(
                        {
                            familyId:
                                "family-001",
                            name:
                                "Familia nueva",
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
                    updateFamilyHandler(
                        {
                            familyId:
                                "family-001",
                            name:
                                "Familia modificada",
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
            },
        );

        it(
            "permite al propietario actualizar la familia",
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

                const result =
                    await updateFamilyHandler(
                        {
                            familyId:
                                "family-001",
                            name:
                                "  Familia modificada  ",
                        },
                        {
                            uid:
                                "parent-owner",
                        },
                    );

                expect(
                    result,
                ).toMatchObject({
                    success:
                        true,
                    familyId:
                        "family-001",
                    name:
                        "Familia modificada",
                    ownerUserId:
                        "parent-owner",
                });

                const snapshot =
                    await db
                        .collection("families")
                        .doc("family-001")
                        .get();

                expect(
                    snapshot.data()?.name,
                ).toBe(
                    "Familia modificada",
                );

                expect(
                    snapshot.data()?.ownerUserId,
                ).toBe(
                    "parent-owner",
                );
            },
        );
    },
);
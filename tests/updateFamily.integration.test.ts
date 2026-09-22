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
    updateFamilyHandler,
} from "../src/functions/families/updateFamily";

describe(
    "updateFamilyHandler integration",
    () => {
        const db =
            getFirestore();

        beforeAll(
            async () => {
                await db
                    .collection("families")
                    .doc("family-update-001")
                    .set({
                        name:
                            "Familia original",
                        ownerUserId:
                            "parent-update-001",
                        createdAt:
                            new Date(),
                        updatedAt:
                            new Date(),
                    });
            },
        );

        it(
            "actualiza una familia en Firestore Emulator",
            async () => {
                const result =
                    await updateFamilyHandler(
                        {
                            familyId:
                                "family-update-001",
                            name:
                                "Familia actualizada",
                        },
                        {
                            uid:
                                "parent-update-001",
                        },
                    );

                expect(
                    result,
                ).toMatchObject({
                    success:
                        true,
                    familyId:
                        "family-update-001",
                    name:
                        "Familia actualizada",
                    ownerUserId:
                        "parent-update-001",
                });

                const snapshot =
                    await db
                        .collection("families")
                        .doc(
                            "family-update-001",
                        )
                        .get();

                expect(
                    snapshot.exists,
                ).toBe(true);

                expect(
                    snapshot.data()?.name,
                ).toBe(
                    "Familia actualizada",
                );

                expect(
                    snapshot.data()?.ownerUserId,
                ).toBe(
                    "parent-update-001",
                );
            },
        );
    },
);
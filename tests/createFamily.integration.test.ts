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
    createFamilyHandler,
} from "../src/functions/families/createFamily";

const projectId =
    process.env.GCLOUD_PROJECT ??
    "eduplay-test";

const firestoreHost =
    "127.0.0.1";

const firestorePort =
    8081;

const db =
    getFirestore();

beforeEach(async () => {
    const response =
        await fetch(
            `http://${firestoreHost}:${firestorePort}/emulator/v1/projects/${projectId}/databases/(default)/documents`,
            {
                method:
                    "DELETE",
            },
        );

    if (!response.ok) {
        throw new Error(
            `No se pudo limpiar Firestore Emulator: ${response.status} ${response.statusText}`,
        );
    }
});

describe(
    "createFamilyHandler integration",
    () => {
        it(
            "crea la familia y el miembro padre en Firestore Emulator",
            async () => {
                const parentId =
                    "parent-family-integration-001";

                await db
                    .collection("users")
                    .doc(parentId)
                    .set({
                        role:
                            "parent",
                    });

                const result =
                    await createFamilyHandler(
                        {
                            name:
                                "Familia EduPlay",
                        },
                        {
                            uid:
                                parentId,
                        },
                    );

                expect(
                    result.success,
                ).toBe(true);

                expect(
                    result.name,
                ).toBe(
                    "Familia EduPlay",
                );

                expect(
                    result.ownerUserId,
                ).toBe(
                    parentId,
                );

                const familySnapshot =
                    await db
                        .collection("families")
                        .doc(
                            result.familyId,
                        )
                        .get();

                expect(
                    familySnapshot.exists,
                ).toBe(true);

                expect(
                    familySnapshot.data(),
                ).toMatchObject({
                    name:
                        "Familia EduPlay",

                    ownerUserId:
                        parentId,
                });

                const memberId =
                    `${result.familyId}_${parentId}`;

                const memberSnapshot =
                    await db
                        .collection("familyMembers")
                        .doc(memberId)
                        .get();

                expect(
                    memberSnapshot.exists,
                ).toBe(true);

                expect(
                    memberSnapshot.data(),
                ).toMatchObject({
                    familyId:
                        result.familyId,

                    userId:
                        parentId,

                    role:
                        "parent",

                    status:
                        "active",
                });
            },
        );
    },
);
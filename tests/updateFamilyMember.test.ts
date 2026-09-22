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
    initializeTestEnvironment,
    type RulesTestEnvironment,
} from "@firebase/rules-unit-testing";

import {
    updateFamilyMemberHandler,
} from "../src/functions/families/updateFamilyMember";

describe(
    "updateFamilyMemberHandler",
    () => {
        let testEnv: RulesTestEnvironment;

        beforeEach(
            async () => {
                testEnv =
                    await initializeTestEnvironment({
                        projectId:
                            "eduplay-test",
                        firestore: {
                            host:
                                "127.0.0.1",
                            port:
                                8081,
                        },
                    });

                await testEnv.clearFirestore();

                const db =
                    getFirestore();

                await db
                    .collection("users")
                    .doc("parent-001")
                    .set({
                        role:
                            "parent",
                    });

                await db
                    .collection("users")
                    .doc("student-001")
                    .set({
                        role:
                            "student",
                    });

                await db
                    .collection("families")
                    .doc("family-001")
                    .set({
                        name:
                            "Familia EduPlay",
                        ownerUserId:
                            "parent-001",
                    });

                await db
                    .collection("familyMembers")
                    .doc(
                        "family-001_student-001",
                    )
                    .set({
                        familyId:
                            "family-001",
                        userId:
                            "student-001",
                        role:
                            "child",
                        status:
                            "active",
                    });
            },
        );

        it(
            "rechaza si no hay autenticación",
            async () => {
                await expect(
                    updateFamilyMemberHandler(
                        {
                            memberId:
                                "family-001_student-001",
                            status:
                                "inactive",
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
            "rechaza si memberId está vacío",
            async () => {
                await expect(
                    updateFamilyMemberHandler(
                        {
                            memberId:
                                "",
                            status:
                                "inactive",
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
            "rechaza un estado inválido",
            async () => {
                await expect(
                    updateFamilyMemberHandler(
                        {
                            memberId:
                                "family-001_student-001",
                            status:
                                "pending" as "active",
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
            "rechaza si el miembro no existe",
            async () => {
                await expect(
                    updateFamilyMemberHandler(
                        {
                            memberId:
                                "family-001_missing",
                            status:
                                "inactive",
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
            "rechaza si la familia no existe",
            async () => {
                const db =
                    getFirestore();

                await db
                    .collection("familyMembers")
                    .doc(
                        "family-missing_student-001",
                    )
                    .set({
                        familyId:
                            "family-missing",
                        userId:
                            "student-001",
                        role:
                            "child",
                        status:
                            "active",
                    });

                await expect(
                    updateFamilyMemberHandler(
                        {
                            memberId:
                                "family-missing_student-001",
                            status:
                                "inactive",
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
            "rechaza si quien modifica no es el propietario",
            async () => {
                await expect(
                    updateFamilyMemberHandler(
                        {
                            memberId:
                                "family-001_student-001",
                            status:
                                "inactive",
                        },
                        {
                            uid:
                                "student-001",
                        },
                    ),
                ).rejects.toMatchObject({
                    code:
                        "permission-denied",
                });
            },
        );

        it(
            "actualiza el estado del miembro si lo hace el propietario",
            async () => {
                const result =
                    await updateFamilyMemberHandler(
                        {
                            memberId:
                                "family-001_student-001",
                            status:
                                "inactive",
                        },
                        {
                            uid:
                                "parent-001",
                        },
                    );

                expect(result).toMatchObject({
                    success:
                        true,
                    memberId:
                        "family-001_student-001",
                    familyId:
                        "family-001",
                    userId:
                        "student-001",
                    status:
                        "inactive",
                });

                const db =
                    getFirestore();

                const snapshot =
                    await db
                        .collection("familyMembers")
                        .doc(
                            "family-001_student-001",
                        )
                        .get();

                expect(
                    snapshot.data()?.status,
                ).toBe(
                    "inactive",
                );
            },
        );
    },
);
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
    HttpsError,
} from "firebase-functions/v2/https";

import {
    addFamilyMemberHandler,
} from "../src/functions/families/addFamilyMember";

describe("addFamilyMemberHandler", () => {
    const db =
        getFirestore();

    beforeEach(async () => {
        await db
            .recursiveDelete(
                db.collection("users"),
            );

        await db
            .recursiveDelete(
                db.collection("families"),
            );

        await db
            .recursiveDelete(
                db.collection("familyMembers"),
            );
    });

    it("rechaza una solicitud sin autenticación", async () => {
        await expect(
            addFamilyMemberHandler(
                {
                    familyId:
                        "family-test-001",
                    userId:
                        "student-test-001",
                    role:
                        "child",
                },
                null,
            ),
        ).rejects.toMatchObject({
            code:
                "unauthenticated",
        });
    });

    it("rechaza familyId vacío", async () => {
        await expect(
            addFamilyMemberHandler(
                {
                    familyId:
                        "",
                    userId:
                        "student-test-001",
                    role:
                        "child",
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
    });

    it("rechaza userId vacío", async () => {
        await expect(
            addFamilyMemberHandler(
                {
                    familyId:
                        "family-test-001",
                    userId:
                        "",
                    role:
                        "child",
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
    });

    it("rechaza un rol inválido", async () => {
        await expect(
            addFamilyMemberHandler(
                {
                    familyId:
                        "family-test-001",
                    userId:
                        "student-test-001",
                    role:
                        "invalid" as "child",
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
    });

    it("rechaza si la familia no existe", async () => {
        await db
            .collection("users")
            .doc("student-test-001")
            .set({
                role:
                    "student",
            });

        await expect(
            addFamilyMemberHandler(
                {
                    familyId:
                        "family-test-001",
                    userId:
                        "student-test-001",
                    role:
                        "child",
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
    });

    it("rechaza a un usuario que no es propietario de la familia", async () => {
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
            .collection("users")
            .doc("student-test-001")
            .set({
                role:
                    "student",
            });

        await expect(
            addFamilyMemberHandler(
                {
                    familyId:
                        "family-test-001",
                    userId:
                        "student-test-001",
                    role:
                        "child",
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
    });

    it("rechaza si el usuario que se quiere agregar no existe", async () => {
        await db
            .collection("families")
            .doc("family-test-001")
            .set({
                name:
                    "Familia Test",
                ownerUserId:
                    "parent-test-001",
            });

        await expect(
            addFamilyMemberHandler(
                {
                    familyId:
                        "family-test-001",
                    userId:
                        "student-test-001",
                    role:
                        "child",
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
    });

    it("rechaza si el usuario ya pertenece a la familia", async () => {
        await db
            .collection("families")
            .doc("family-test-001")
            .set({
                name:
                    "Familia Test",
                ownerUserId:
                    "parent-test-001",
            });

        await db
            .collection("users")
            .doc("student-test-001")
            .set({
                role:
                    "student",
            });

        await db
            .collection("familyMembers")
            .doc(
                "family-test-001_student-test-001",
            )
            .set({
                familyId:
                    "family-test-001",
                userId:
                    "student-test-001",
                role:
                    "child",
                status:
                    "active",
            });

        await expect(
            addFamilyMemberHandler(
                {
                    familyId:
                        "family-test-001",
                    userId:
                        "student-test-001",
                    role:
                        "child",
                },
                {
                    uid:
                        "parent-test-001",
                },
            ),
        ).rejects.toMatchObject({
            code:
                "already-exists",
        });
    });

    it("agrega correctamente un hijo a la familia", async () => {
        await db
            .collection("families")
            .doc("family-test-001")
            .set({
                name:
                    "Familia Test",
                ownerUserId:
                    "parent-test-001",
            });

        await db
            .collection("users")
            .doc("student-test-001")
            .set({
                role:
                    "student",
            });

        const result =
            await addFamilyMemberHandler(
                {
                    familyId:
                        "family-test-001",
                    userId:
                        "student-test-001",
                    role:
                        "child",
                },
                {
                    uid:
                        "parent-test-001",
                },
            );

        expect(result).toEqual({
            success:
                true,

            memberId:
                "family-test-001_student-test-001",

            familyId:
                "family-test-001",

            userId:
                "student-test-001",

            role:
                "child",
        });

        const memberSnapshot =
            await db
                .collection("familyMembers")
                .doc(
                    "family-test-001_student-test-001",
                )
                .get();

        expect(
            memberSnapshot.exists,
        ).toBe(true);

        expect(
            memberSnapshot.data(),
        ).toMatchObject({
            familyId:
                "family-test-001",

            userId:
                "student-test-001",

            role:
                "child",

            status:
                "active",
        });
    });

    it("permite agregar otro padre a la familia", async () => {
        await db
            .collection("families")
            .doc("family-test-001")
            .set({
                name:
                    "Familia Test",
                ownerUserId:
                    "parent-test-001",
            });

        await db
            .collection("users")
            .doc("parent-test-002")
            .set({
                role:
                    "parent",
            });

        const result =
            await addFamilyMemberHandler(
                {
                    familyId:
                        "family-test-001",
                    userId:
                        "parent-test-002",
                    role:
                        "parent",
                },
                {
                    uid:
                        "parent-test-001",
                },
            );

        expect(
            result.memberId,
        ).toBe(
            "family-test-001_parent-test-002",
        );

        const memberSnapshot =
            await db
                .collection("familyMembers")
                .doc(
                    "family-test-001_parent-test-002",
                )
                .get();

        expect(
            memberSnapshot.exists,
        ).toBe(true);

        expect(
            memberSnapshot.data(),
        ).toMatchObject({
            familyId:
                "family-test-001",

            userId:
                "parent-test-002",

            role:
                "parent",

            status:
                "active",
        });
    });
});
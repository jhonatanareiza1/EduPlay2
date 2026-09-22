import { describe, it, expect } from "vitest";

import {
    getApps,
    initializeApp,
} from "firebase-admin/app";

import {
    getFirestore,
} from "firebase-admin/firestore";

import {
    createFamilyHandler,
} from "../src/functions/families/createFamily";

process.env.FIRESTORE_EMULATOR_HOST ??=
    "127.0.0.1:8081";

const projectId =
    process.env.GCLOUD_PROJECT ?? "eduplay-test";

if (getApps().length === 0) {
    initializeApp({
        projectId,
    });
}

const db =
    getFirestore();

describe("createFamilyHandler", () => {
    it("rechaza una llamada sin autenticación", async () => {
        await expect(
            createFamilyHandler(
                {
                    name: "Familia de prueba",
                },
                null,
            ),
        ).rejects.toMatchObject({
            code: "unauthenticated",
        });
    });

    it("rechaza un nombre vacío", async () => {
        await expect(
            createFamilyHandler(
                {
                    name: "",
                },
                {
                    uid: "parent-test-001",
                },
            ),
        ).rejects.toMatchObject({
            code: "invalid-argument",
        });
    });

    it("rechaza un nombre con solo espacios", async () => {
        await expect(
            createFamilyHandler(
                {
                    name: "   ",
                },
                {
                    uid: "parent-test-001",
                },
            ),
        ).rejects.toMatchObject({
            code: "invalid-argument",
        });
    });

    it("rechaza un usuario que no existe", async () => {
        await expect(
            createFamilyHandler(
                {
                    name: "Familia inexistente",
                },
                {
                    uid:
                        "parent-does-not-exist",
                },
            ),
        ).rejects.toMatchObject({
            code: "not-found",
        });
    });

    it("rechaza a un usuario que no es padre", async () => {
        const userId =
            "student-family-test-001";

        await db
            .collection("users")
            .doc(userId)
            .set({
                role:
                    "student",
                email:
                    "student-family-test@example.com",
            });

        await expect(
            createFamilyHandler(
                {
                    name: "Familia de estudiante",
                },
                {
                    uid:
                        userId,
                },
            ),
        ).rejects.toMatchObject({
            code: "permission-denied",
        });
    });

    it("crea la familia y agrega al padre como miembro", async () => {
        const userId =
            "parent-family-test-001";

        await db
            .collection("users")
            .doc(userId)
            .set({
                role:
                    "parent",
                email:
                    "parent-family-test@example.com",
            });

        const result =
            await createFamilyHandler(
                {
                    name:
                        "  Familia EduPlay  ",
                },
                {
                    uid:
                        userId,
                },
            );

        expect(result.success).toBe(true);
        expect(result.familyId).toBeDefined();
        expect(result.name).toBe(
            "Familia EduPlay",
        );
        expect(result.ownerUserId).toBe(
            userId,
        );

        const familySnapshot =
            await db
                .collection("families")
                .doc(result.familyId)
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
                userId,
        });

        const familyMemberSnapshot =
            await db
                .collection("familyMembers")
                .doc(
                    `${result.familyId}_${userId}`,
                )
                .get();

        expect(
            familyMemberSnapshot.exists,
        ).toBe(true);

        expect(
            familyMemberSnapshot.data(),
        ).toMatchObject({
            familyId:
                result.familyId,
            userId,
            role:
                "parent",
            status:
                "active",
        });
    });
});
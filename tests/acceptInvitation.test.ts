import { describe, it, expect } from "vitest";

import {
    getApps,
    initializeApp,
} from "firebase-admin/app";

import {
    getFirestore,
} from "firebase-admin/firestore";

import {
    acceptInvitationHandler,
} from "../src/functions/invitations/acceptInvitation";

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

describe("acceptInvitationHandler", () => {
    it("rechaza una llamada sin autenticación", async () => {
        await expect(
            acceptInvitationHandler(
                {
                    invitationId: "invitation-test-001",
                },
                null,
            ),
        ).rejects.toMatchObject({
            code: "unauthenticated",
        });
    });

    it("rechaza invitationId vacío", async () => {
        await expect(
            acceptInvitationHandler(
                {
                    invitationId: "",
                },
                {
                    uid: "student-test-001",
                },
            ),
        ).rejects.toMatchObject({
            code: "invalid-argument",
        });
    });

    it("rechaza invitationId inválido", async () => {
        await expect(
            acceptInvitationHandler(
                {
                    invitationId: "   ",
                },
                {
                    uid: "student-test-001",
                },
            ),
        ).rejects.toMatchObject({
            code: "invalid-argument",
        });
    });

    it("rechaza una invitación inexistente", async () => {
        await expect(
            acceptInvitationHandler(
                {
                    invitationId: "invitation-does-not-exist",
                },
                {
                    uid: "student-test-001",
                },
            ),
        ).rejects.toMatchObject({
            code: "not-found",
        });
    });

    it("acepta una invitación familiar y crea el miembro de la familia", async () => {
        const invitationId =
            "invitation-family-test-001";

        const familyId =
            "family-test-001";

        const studentId =
            "student-test-001";

        const invitationRef =
            db
                .collection("invitations")
                .doc(invitationId);

        const familyRef =
            db
                .collection("families")
                .doc(familyId);

        const familyMemberRef =
            db
                .collection("familyMembers")
                .doc(
                    `${familyId}_${studentId}`,
                );

        await familyRef.set({
            name:
                "Familia de prueba",

            ownerUserId:
                "parent-test-001",

            createdAt:
                new Date(),

            updatedAt:
                new Date(),
        });

        await invitationRef.set({
            invitedUserId:
                studentId,

            invitedByUserId:
                "parent-test-001",

            type:
                "family",

            familyId,

            status:
                "pending",

            createdAt:
                new Date(),
        });

        const result =
            await acceptInvitationHandler(
                {
                    invitationId,
                },
                {
                    uid:
                        studentId,
                },
            );

        expect(result).toEqual({
            success: true,
            invitationId,
            status: "accepted",
        });

        const updatedInvitation =
            await invitationRef.get();

        expect(
            updatedInvitation.data()?.status,
        ).toBe("accepted");

        expect(
            updatedInvitation.data()?.acceptedAt,
        ).toBeDefined();

        const familyMember =
            await familyMemberRef.get();

        expect(
            familyMember.exists,
        ).toBe(true);

        expect(
            familyMember.data(),
        ).toMatchObject({
            familyId,
            userId:
                studentId,
            role:
                "child",
            status:
                "active",
        });
    });

    it("rechaza una invitación familiar si la familia no existe", async () => {
        const invitationId =
            "invitation-family-test-002";

        const familyId =
            "family-does-not-exist";

        const studentId =
            "student-test-002";

        const invitationRef =
            db
                .collection("invitations")
                .doc(invitationId);

        await invitationRef.set({
            invitedUserId:
                studentId,

            invitedByUserId:
                "parent-test-002",

            type:
                "family",

            familyId,

            status:
                "pending",

            createdAt:
                new Date(),
        });

        await expect(
            acceptInvitationHandler(
                {
                    invitationId,
                },
                {
                    uid:
                        studentId,
                },
            ),
        ).rejects.toMatchObject({
            code: "not-found",
        });

        const invitation =
            await invitationRef.get();

        expect(
            invitation.data()?.status,
        ).toBe("pending");

        const familyMember =
            await db
                .collection("familyMembers")
                .doc(
                    `${familyId}_${studentId}`,
                )
                .get();

        expect(
            familyMember.exists,
        ).toBe(false);
    });
});
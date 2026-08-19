import { describe, it, expect } from "vitest";

import {
    createInvitationHandler,
    type CreateInvitationData,
} from "../src/functions/invitations/createInvitation";

describe("createInvitationHandler", () => {
    it("rechaza una llamada sin autenticación", async () => {
        const data: CreateInvitationData = {
            invitedUserId: "student-test-001",
            type: "family",
            familyId: "family-test-001",
        };

        await expect(
            createInvitationHandler(data, null),
        ).rejects.toMatchObject({
            code: "unauthenticated",
        });
    });

    it("rechaza invitedUserId vacío", async () => {
        const data = {
            invitedUserId: "",
            type: "family",
            familyId: "family-test-001",
        } as CreateInvitationData;

        await expect(
            createInvitationHandler(data, {
                uid: "parent-test-001",
            }),
        ).rejects.toMatchObject({
            code: "invalid-argument",
        });
    });

    it("rechaza un tipo de invitación inválido", async () => {
        const data = {
            invitedUserId: "student-test-001",
            type: "invalid",
            familyId: "family-test-001",
        } as unknown as CreateInvitationData;

        await expect(
            createInvitationHandler(data, {
                uid: "parent-test-001",
            }),
        ).rejects.toMatchObject({
            code: "invalid-argument",
        });
    });

    it("impide que un usuario se invite a sí mismo", async () => {
        const data: CreateInvitationData = {
            invitedUserId: "parent-test-001",
            type: "family",
            familyId: "family-test-001",
        };

        await expect(
            createInvitationHandler(data, {
                uid: "parent-test-001",
            }),
        ).rejects.toMatchObject({
            code: "invalid-argument",
        });
    });

    it("exige familyId para invitaciones familiares", async () => {
        const data: CreateInvitationData = {
            invitedUserId: "student-test-001",
            type: "family",
        };

        await expect(
            createInvitationHandler(data, {
                uid: "parent-test-001",
            }),
        ).rejects.toMatchObject({
            code: "invalid-argument",
        });
    });

    it("exige groupId para invitaciones de grupo", async () => {
        const data: CreateInvitationData = {
            invitedUserId: "student-test-001",
            type: "group",
        };

        await expect(
            createInvitationHandler(data, {
                uid: "teacher-test-001",
            }),
        ).rejects.toMatchObject({
            code: "invalid-argument",
        });
    });
});
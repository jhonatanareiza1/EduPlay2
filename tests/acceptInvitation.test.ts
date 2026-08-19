import { describe, it, expect } from "vitest";
import {
    acceptInvitationHandler,
} from "../src/functions/invitations/acceptInvitation";

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
});
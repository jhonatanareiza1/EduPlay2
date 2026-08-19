import { describe, it, expect } from "vitest";

import {
    joinClassSessionHandler,
} from "../src/functions/sessions/joinClassSession";

describe("joinClassSessionHandler", () => {
    it("rechaza una llamada sin autenticación", async () => {
        await expect(
            joinClassSessionHandler(
                {
                    sessionId: "session-test-001",
                },
                null,
            ),
        ).rejects.toMatchObject({
            code: "unauthenticated",
        });
    });

    it("rechaza sessionId vacío", async () => {
        await expect(
            joinClassSessionHandler(
                {
                    sessionId: "",
                },
                {
                    uid: "student-test-001",
                },
            ),
        ).rejects.toMatchObject({
            code: "invalid-argument",
        });
    });

    it("rechaza una sesión inexistente", async () => {
        await expect(
            joinClassSessionHandler(
                {
                    sessionId: "session-does-not-exist",
                },
                {
                    uid: "student-test-001",
                },
            ),
        ).rejects.toMatchObject({
            code: "not-found",
        });
    });

    it("rechaza un sessionId compuesto solo por espacios", async () => {
        await expect(
            joinClassSessionHandler(
                {
                    sessionId: "   ",
                },
                {
                    uid: "student-test-001",
                },
            ),
        ).rejects.toMatchObject({
            code: "invalid-argument",
        });
    });
});
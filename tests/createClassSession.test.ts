import { describe, it, expect } from "vitest";

import {
    createClassSessionHandler,
} from "../src/functions/sessions/createClassSession";

describe("createClassSessionHandler", () => {
    it("rechaza una llamada sin autenticación", async () => {
        await expect(
            createClassSessionHandler(
                {
                    groupId: "group-test-001",
                    title: "Clase de prueba",
                },
                null,
            ),
        ).rejects.toMatchObject({
            code: "unauthenticated",
        });
    });

    it("rechaza groupId vacío", async () => {
        await expect(
            createClassSessionHandler(
                {
                    groupId: "",
                    title: "Clase de prueba",
                },
                {
                    uid: "teacher-test-001",
                },
            ),
        ).rejects.toMatchObject({
            code: "invalid-argument",
        });
    });

    it("rechaza title vacío", async () => {
        await expect(
            createClassSessionHandler(
                {
                    groupId: "group-test-001",
                    title: "",
                },
                {
                    uid: "teacher-test-001",
                },
            ),
        ).rejects.toMatchObject({
            code: "invalid-argument",
        });
    });

    it("rechaza un grupo inexistente", async () => {
        await expect(
            createClassSessionHandler(
                {
                    groupId: "group-does-not-exist",
                    title: "Clase de prueba",
                },
                {
                    uid: "teacher-test-001",
                },
            ),
        ).rejects.toMatchObject({
            code: "not-found",
        });
    });
});

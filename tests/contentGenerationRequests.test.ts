import {
    describe,
    expect,
    it,
} from "vitest";

import {
    createContentGenerationRequest,
    updateContentGenerationRequest,
} from "../src/functions/domain/ia/contentGenerationRequests";

describe("contentGenerationRequests", () => {
    const auth = {
        uid: "user-1",
    };

    it("rechaza crear una solicitud sin autenticación", async () => {
        await expect(
            createContentGenerationRequest(
                {
                    userId: "user-1",
                    type: "quiz",
                    prompt: "Crear un quiz",
                    parameters: {},
                },
                null,
            ),
        ).rejects.toMatchObject({
            code: "unauthenticated",
        });
    });

    it("rechaza una solicitud sin tipo", async () => {
        await expect(
            createContentGenerationRequest(
                {
                    userId: "user-1",
                    type: "",
                    prompt: "Crear contenido",
                    parameters: {},
                },
                auth,
            ),
        ).rejects.toMatchObject({
            code: "invalid-argument",
        });
    });

    it("rechaza actualizar sin autenticación", async () => {
        await expect(
            updateContentGenerationRequest(
                "request-1",
                "completed",
                null,
            ),
        ).rejects.toMatchObject({
            code: "unauthenticated",
        });
    });

    it("rechaza actualizar con requestId vacío", async () => {
        await expect(
            updateContentGenerationRequest(
                "",
                "completed",
                auth,
            ),
        ).rejects.toMatchObject({
            code: "invalid-argument",
        });
    });

    it("rechaza un estado inválido", async () => {
        await expect(
            updateContentGenerationRequest(
                "request-1",
                "invalid-status" as never,
                auth,
            ),
        ).rejects.toMatchObject({
            code: "invalid-argument",
        });
    });

    it("rechaza datos sin prompt", async () => {
        await expect(
            createContentGenerationRequest(
                {
                    userId: "user-1",
                    type: "quiz",
                    prompt: "",
                    parameters: {},
                },
                auth,
            ),
        ).rejects.toMatchObject({
            code: "invalid-argument",
        });
    });
});

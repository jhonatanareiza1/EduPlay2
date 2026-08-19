import { describe, it, expect, vi, beforeEach } from "vitest";
import { HttpsError } from "firebase-functions/v2/https";

const get = vi.fn();
const update = vi.fn();

vi.mock("firebase-admin/firestore", () => ({
    getFirestore: () => ({
        collection: () => ({
            doc: () => ({
                get,
                update,
            }),
        }),
    }),
}));

import {
    validateAIContentHandler,
} from "../src/functions/ai/validateAIContent";

describe("validateAIContentHandler", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("rechaza una llamada sin autenticación", async () => {
        await expect(
            validateAIContentHandler(
                {
                    requestId: "request-test-001",
                    content: {
                        question: "Pregunta",
                    },
                },
                null,
            ),
        ).rejects.toBeInstanceOf(HttpsError);
    });

    it("rechaza un requestId vacío", async () => {
        await expect(
            validateAIContentHandler(
                {
                    requestId: "",
                    content: {
                        question: "Pregunta",
                    },
                },
                {
                    uid: "teacher-test-001",
                },
            ),
        ).rejects.toMatchObject({
            code: "invalid-argument",
        });
    });

    it("rechaza contenido vacío", async () => {
        await expect(
            validateAIContentHandler(
                {
                    requestId: "request-test-001",
                    content: null,
                },
                {
                    uid: "teacher-test-001",
                },
            ),
        ).rejects.toMatchObject({
            code: "invalid-argument",
        });
    });

    it("rechaza una solicitud inexistente", async () => {
        get.mockResolvedValue({
            exists: false,
        });

        await expect(
            validateAIContentHandler(
                {
                    requestId: "request-test-001",
                    content: {
                        question: "Pregunta",
                    },
                },
                {
                    uid: "teacher-test-001",
                },
            ),
        ).rejects.toMatchObject({
            code: "not-found",
        });
    });

    it("impide validar contenido de otro usuario", async () => {
        get.mockResolvedValue({
            exists: true,
            data: () => ({
                requestedBy: "teacher-other",
            }),
        });

        await expect(
            validateAIContentHandler(
                {
                    requestId: "request-test-001",
                    content: {
                        question: "Pregunta",
                    },
                },
                {
                    uid: "teacher-test-001",
                },
            ),
        ).rejects.toMatchObject({
            code: "permission-denied",
        });
    });

    it("valida contenido propio correctamente", async () => {
        get.mockResolvedValue({
            exists: true,
            data: () => ({
                requestedBy: "teacher-test-001",
            }),
        });

        const result = await validateAIContentHandler(
            {
                requestId: "request-test-001",
                content: {
                    question: "¿Cuánto es 2 + 2?",
                    answer: "4",
                },
            },
            {
                uid: "teacher-test-001",
            },
        );

        expect(result).toEqual({
            success: true,
            requestId: "request-test-001",
            valid: true,
        });

        expect(update).toHaveBeenCalledTimes(1);
    });
});
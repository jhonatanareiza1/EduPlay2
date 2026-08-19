import { describe, it, expect, vi, beforeEach } from "vitest";
import { HttpsError } from "firebase-functions/v2/https";

const create = vi.fn();

vi.mock("firebase-admin/firestore", () => ({
    getFirestore: () => ({
        collection: () => ({
            doc: () => ({
                id: "request-test-001",
                create,
            }),
        }),
    }),
}));

import {
    generateAIContentHandler,
} from "../src/functions/ai/generateAIContent";

describe("generateAIContentHandler", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("rechaza una llamada sin autenticación", async () => {
        await expect(
            generateAIContentHandler(
                {
                    type: "quiz",
                    topic: "Matemáticas",
                },
                null,
            ),
        ).rejects.toBeInstanceOf(HttpsError);
    });

    it("rechaza un tipo vacío", async () => {
        await expect(
            generateAIContentHandler(
                {
                    type: "",
                    topic: "Matemáticas",
                },
                {
                    uid: "teacher-test-001",
                },
            ),
        ).rejects.toMatchObject({
            code: "invalid-argument",
        });
    });

    it("rechaza un tema vacío", async () => {
        await expect(
            generateAIContentHandler(
                {
                    type: "quiz",
                    topic: "",
                },
                {
                    uid: "teacher-test-001",
                },
            ),
        ).rejects.toMatchObject({
            code: "invalid-argument",
        });
    });

    it("rechaza una cantidad inválida", async () => {
        await expect(
            generateAIContentHandler(
                {
                    type: "quiz",
                    topic: "Matemáticas",
                    quantity: 101,
                },
                {
                    uid: "teacher-test-001",
                },
            ),
        ).rejects.toMatchObject({
            code: "invalid-argument",
        });
    });

    it("crea una solicitud válida", async () => {
        const result = await generateAIContentHandler(
            {
                type: "quiz",
                topic: "Matemáticas",
                difficulty: "medium",
                language: "es",
                quantity: 10,
            },
            {
                uid: "teacher-test-001",
            },
        );

        expect(result.success).toBe(true);
        expect(result.requestId).toBe("request-test-001");
        expect(result.content).toBeNull();

        expect(create).toHaveBeenCalledTimes(1);
    });
});
import {
    beforeEach,
    describe,
    expect,
    it,
    vi,
} from "vitest";

const {
    generateContentMock,
    getGenerativeModelMock,
    GoogleGenerativeAIMock,
} = vi.hoisted(() => {
    const generateContentMock = vi.fn();

    const getGenerativeModelMock = vi.fn(() => ({
        generateContent: generateContentMock,
    }));

    const GoogleGenerativeAIMock = vi.fn(function () {
        return {
            getGenerativeModel:
                getGenerativeModelMock,
        };
    });

    return {
        generateContentMock,
        getGenerativeModelMock,
        GoogleGenerativeAIMock,
    };
});

vi.mock("@google/generative-ai", () => ({
    GoogleGenerativeAI: GoogleGenerativeAIMock,
}));

import { GeminiAIProvider } from "../src/functions/domain/ia/GeminiAIProvider";

describe("GeminiAIProvider", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe("constructor", () => {
        it("rechaza una API key vacía", () => {
            expect(
                () =>
                    new GeminiAIProvider(
                        "",
                        "gemini-2.5-flash",
                    ),
            ).toThrow(
                "Gemini API key is required.",
            );
        });

        it("rechaza una API key con espacios", () => {
            expect(
                () =>
                    new GeminiAIProvider(
                        "   ",
                        "gemini-2.5-flash",
                    ),
            ).toThrow(
                "Gemini API key is required.",
            );
        });

        it("rechaza un modelo vacío", () => {
            expect(
                () =>
                    new GeminiAIProvider(
                        "test-api-key",
                        "",
                    ),
            ).toThrow(
                "Gemini model is required.",
            );
        });

        it("crea correctamente el modelo de Gemini", () => {
            new GeminiAIProvider(
                "test-api-key",
                "gemini-2.5-flash",
            );

            expect(
                GoogleGenerativeAIMock,
            ).toHaveBeenCalledWith(
                "test-api-key",
            );

            expect(
                getGenerativeModelMock,
            ).toHaveBeenCalledWith({
                model: "gemini-2.5-flash",
            });
        });
    });

    describe("generateContent", () => {
        it("rechaza una solicitud inexistente", async () => {
            const provider =
                new GeminiAIProvider(
                    "test-api-key",
                    "gemini-2.5-flash",
                );

            await expect(
                provider.generateContent(
                    null as never,
                ),
            ).rejects.toThrow(
                "AI generation request is required.",
            );
        });

        it("rechaza un tipo de contenido vacío", async () => {
            const provider =
                new GeminiAIProvider(
                    "test-api-key",
                    "gemini-2.5-flash",
                );

            await expect(
                provider.generateContent({
                    type: "",
                }),
            ).rejects.toThrow(
                "Content type is required.",
            );
        });

        it("genera contenido correctamente", async () => {
            generateContentMock.mockResolvedValueOnce({
                response: {
                    text: () =>
                        JSON.stringify({
                            title: "Fracciones",
                            questions: [
                                {
                                    question:
                                        "¿Qué es una fracción?",
                                    answer:
                                        "Una representación de partes de un todo.",
                                },
                            ],
                        }),
                },
            });

            const provider =
                new GeminiAIProvider(
                    "test-api-key",
                    "gemini-2.5-flash",
                );

            const result =
                await provider.generateContent({
                    type: "quiz",
                    subject: "Matemáticas",
                    topic: "Fracciones",
                    difficulty: "easy",
                    language: "es",
                    count: 1,
                });

            expect(
                generateContentMock,
            ).toHaveBeenCalledTimes(1);

            expect(result.provider).toBe(
                "gemini",
            );

            expect(result.model).toBe(
                "gemini-2.5-flash",
            );

            expect(result.content).toEqual({
                title: "Fracciones",
                questions: [
                    {
                        question:
                            "¿Qué es una fracción?",
                        answer:
                            "Una representación de partes de un todo.",
                    },
                ],
            });

            expect(
                result.generatedAt,
            ).toBeInstanceOf(Date);
        });

        it("maneja una respuesta JSON envuelta en markdown", async () => {
            generateContentMock.mockResolvedValueOnce({
                response: {
                    text: () =>
                        `\`\`\`json
{
    "title": "Matemáticas",
    "difficulty": "easy"
}
\`\`\``,
                },
            });

            const provider =
                new GeminiAIProvider(
                    "test-api-key",
                    "gemini-2.5-flash",
                );

            const result =
                await provider.generateContent({
                    type: "quiz",
                });

            expect(result.content).toEqual({
                title: "Matemáticas",
                difficulty: "easy",
            });
        });

        it("devuelve texto cuando Gemini no devuelve JSON válido", async () => {
            generateContentMock.mockResolvedValueOnce({
                response: {
                    text: () =>
                        "Esta es una respuesta que no es JSON.",
                },
            });

            const provider =
                new GeminiAIProvider(
                    "test-api-key",
                    "gemini-2.5-flash",
                );

            const result =
                await provider.generateContent({
                    type: "lesson",
                });

            expect(result.content).toEqual({
                text: "Esta es una respuesta que no es JSON.",
            });
        });

        it("rechaza una respuesta vacía de Gemini", async () => {
            generateContentMock.mockResolvedValueOnce({
                response: {
                    text: () => "",
                },
            });

            const provider =
                new GeminiAIProvider(
                    "test-api-key",
                    "gemini-2.5-flash",
                );

            await expect(
                provider.generateContent({
                    type: "quiz",
                }),
            ).rejects.toThrow(
                "Gemini returned an empty response.",
            );
        });
    });

    describe("validateContent", () => {
        it("rechaza contenido null", async () => {
            const provider =
                new GeminiAIProvider(
                    "test-api-key",
                    "gemini-2.5-flash",
                );

            const result =
                await provider.validateContent(
                    null,
                );

            expect(result).toEqual({
                valid: false,
                errors: [
                    "El contenido no puede estar vacío.",
                ],
                warnings: [],
            });

            expect(
                generateContentMock,
            ).not.toHaveBeenCalled();
        });

        it("rechaza contenido undefined", async () => {
            const provider =
                new GeminiAIProvider(
                    "test-api-key",
                    "gemini-2.5-flash",
                );

            const result =
                await provider.validateContent(
                    undefined,
                );

            expect(result.valid).toBe(false);

            expect(
                result.errors,
            ).toContain(
                "El contenido no puede estar vacío.",
            );
        });

        it("valida correctamente contenido válido", async () => {
            generateContentMock.mockResolvedValueOnce({
                response: {
                    text: () =>
                        JSON.stringify({
                            valid: true,
                            errors: [],
                            warnings: [],
                        }),
                },
            });

            const provider =
                new GeminiAIProvider(
                    "test-api-key",
                    "gemini-2.5-flash",
                );

            const content = {
                title: "Fracciones",
                questions: [],
            };

            const result =
                await provider.validateContent(
                    content,
                );

            expect(result.valid).toBe(true);

            expect(result.errors).toEqual([]);

            expect(result.warnings).toEqual([]);

            expect(
                result.normalizedContent,
            ).toEqual(content);
        });

        it("devuelve errores y advertencias de Gemini", async () => {
            generateContentMock.mockResolvedValueOnce({
                response: {
                    text: () =>
                        JSON.stringify({
                            valid: false,
                            errors: [
                                "La pregunta no es clara.",
                            ],
                            warnings: [
                                "Falta contexto adicional.",
                            ],
                        }),
                },
            });

            const provider =
                new GeminiAIProvider(
                    "test-api-key",
                    "gemini-2.5-flash",
                );

            const content = {
                question: "¿Qué es X?",
            };

            const result =
                await provider.validateContent(
                    content,
                );

            expect(result.valid).toBe(false);

            expect(result.errors).toEqual([
                "La pregunta no es clara.",
            ]);

            expect(result.warnings).toEqual([
                "Falta contexto adicional.",
            ]);

            expect(
                result.normalizedContent,
            ).toEqual(content);
        });

        it("maneja una respuesta de validación inválida", async () => {
            generateContentMock.mockResolvedValueOnce({
                response: {
                    text: () =>
                        "Esto no es JSON válido.",
                },
            });

            const provider =
                new GeminiAIProvider(
                    "test-api-key",
                    "gemini-2.5-flash",
                );

            const content = {
                title: "Contenido",
            };

            const result =
                await provider.validateContent(
                    content,
                );

            expect(result.valid).toBe(false);

            expect(
                result.errors,
            ).toContain(
                "No fue posible interpretar la respuesta de validación.",
            );

            expect(
                result.normalizedContent,
            ).toEqual(content);
        });

        it("maneja una respuesta de validación vacía", async () => {
            generateContentMock.mockResolvedValueOnce({
                response: {
                    text: () => "",
                },
            });

            const provider =
                new GeminiAIProvider(
                    "test-api-key",
                    "gemini-2.5-flash",
                );

            const result =
                await provider.validateContent({
                    title: "Contenido",
                });

            expect(result.valid).toBe(false);

            expect(
                result.errors,
            ).toContain(
                "El proveedor de IA no devolvió una validación.",
            );
        });
    });
});
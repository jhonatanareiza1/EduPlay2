import {
    GoogleGenerativeAI,
    GenerativeModel,
} from "@google/generative-ai";

import type {
    AIContentGenerationRequest,
    AIContentGenerationResult,
    AIContentValidationResult,
    AIProvider,
} from "./AIProvider";

export class GeminiAIProvider implements AIProvider {
    private readonly model: GenerativeModel;
    private readonly modelName: string;

    constructor(
        apiKey: string,
        modelName: string,
    ) {
        if (!apiKey || apiKey.trim() === "") {
            throw new Error("Gemini API key is required.");
        }

        if (!modelName || modelName.trim() === "") {
            throw new Error("Gemini model is required.");
        }

        const client = new GoogleGenerativeAI(apiKey);

        this.modelName = modelName;

        this.model = client.getGenerativeModel({
            model: modelName,
        });
    }

    async generateContent(
        request: AIContentGenerationRequest,
    ): Promise<AIContentGenerationResult> {
        if (!request || typeof request !== "object") {
            throw new Error("AI generation request is required.");
        }

        if (
            typeof request.type !== "string" ||
            request.type.trim() === ""
        ) {
            throw new Error("Content type is required.");
        }

        const prompt = this.buildGenerationPrompt(request);

        const result = await this.model.generateContent(prompt);

        const response = result.response;

        const text = response.text();

        if (!text || text.trim() === "") {
            throw new Error(
                "Gemini returned an empty response.",
            );
        }

        const content = this.parseResponse(text);

        return {
            content,
            provider: "gemini",
            model: this.modelName,
            generatedAt: new Date(),
        };
    }

    async validateContent(
        content: unknown,
        context?: Record<string, unknown>,
    ): Promise<AIContentValidationResult> {
        if (
            content === null ||
            content === undefined
        ) {
            return {
                valid: false,
                errors: [
                    "El contenido no puede estar vacío.",
                ],
                warnings: [],
            };
        }

        const validationPrompt = this.buildValidationPrompt(
            content,
            context,
        );

        const result = await this.model.generateContent(
            validationPrompt,
        );

        const text = result.response.text();

        if (!text || text.trim() === "") {
            return {
                valid: false,
                errors: [
                    "El proveedor de IA no devolvió una validación.",
                ],
                warnings: [],
            };
        }

        return this.parseValidationResponse(text, content);
    }

    private buildGenerationPrompt(
        request: AIContentGenerationRequest,
    ): string {
        const sections: string[] = [];

        sections.push(
            "Eres un generador de contenido educativo para EduPlay.",
        );

        sections.push(
            "Genera contenido apropiado para estudiantes.",
        );

        sections.push(
            "Devuelve únicamente JSON válido, sin markdown.",
        );

        sections.push(
            `Tipo de contenido: ${request.type}`,
        );

        if (request.subject) {
            sections.push(
                `Materia: ${request.subject}`,
            );
        }

        if (request.topic) {
            sections.push(
                `Tema: ${request.topic}`,
            );
        }

        if (request.difficulty) {
            sections.push(
                `Dificultad: ${request.difficulty}`,
            );
        }

        if (request.language) {
            sections.push(
                `Idioma: ${request.language}`,
            );
        }

        if (request.count !== undefined) {
            sections.push(
                `Cantidad: ${request.count}`,
            );
        }

        if (request.instructions) {
            sections.push(
                `Instrucciones: ${request.instructions}`,
            );
        }

        if (request.context) {
            sections.push(
                `Contexto adicional: ${JSON.stringify(
                    request.context,
                )}`,
            );
        }

        sections.push(
            "La respuesta debe ser utilizable directamente por EduPlay.",
        );

        return sections.join("\n");
    }

    private buildValidationPrompt(
        content: unknown,
        context?: Record<string, unknown>,
    ): string {
        return [
            "Eres un validador de contenido educativo de EduPlay.",
            "Analiza el contenido proporcionado.",
            "Comprueba coherencia, estructura, seguridad y adecuación educativa.",
            "Devuelve únicamente JSON válido.",
            "",
            "Formato obligatorio:",
            JSON.stringify({
                valid: true,
                errors: [],
                warnings: [],
            }),
            "",
            `Contenido: ${JSON.stringify(content)}`,
            context
                ? `Contexto: ${JSON.stringify(context)}`
                : "",
        ]
            .filter(Boolean)
            .join("\n");
    }

    private parseResponse(
        text: string,
    ): unknown {
        const cleaned = this.cleanJsonResponse(text);

        try {
            return JSON.parse(cleaned);
        } catch {
            return {
                text: text.trim(),
            };
        }
    }

    private parseValidationResponse(
        text: string,
        originalContent: unknown,
    ): AIContentValidationResult {
        const cleaned = this.cleanJsonResponse(text);

        try {
            const parsed: unknown = JSON.parse(cleaned);

            if (
                !parsed ||
                typeof parsed !== "object" ||
                Array.isArray(parsed)
            ) {
                throw new Error(
                    "Invalid validation response.",
                );
            }

            const data =
                parsed as Record<string, unknown>;

            const valid =
                typeof data.valid === "boolean"
                    ? data.valid
                    : false;

            const errors =
                Array.isArray(data.errors)
                    ? data.errors.filter(
                        (item): item is string =>
                            typeof item === "string",
                    )
                    : [];

            const warnings =
                Array.isArray(data.warnings)
                    ? data.warnings.filter(
                        (item): item is string =>
                            typeof item === "string",
                    )
                    : [];

            return {
                valid,
                errors,
                warnings,
                normalizedContent:
                    data.normalizedContent ??
                    originalContent,
            };
        } catch {
            return {
                valid: false,
                errors: [
                    "No fue posible interpretar la respuesta de validación.",
                ],
                warnings: [],
                normalizedContent: originalContent,
            };
        }
    }

    private cleanJsonResponse(
        text: string,
    ): string {
        const trimmed = text.trim();

        if (
            trimmed.startsWith("```json") &&
            trimmed.endsWith("```")
        ) {
            return trimmed
                .slice(7, -3)
                .trim();
        }

        if (
            trimmed.startsWith("```") &&
            trimmed.endsWith("```")
        ) {
            return trimmed
                .slice(3, -3)
                .trim();
        }

        return trimmed;
    }
}
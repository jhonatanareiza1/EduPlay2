import { HttpsError } from "firebase-functions/v2/https";

import type {
    AIContentValidationResult,
} from "./AIProvider";

import {
    createAIProvider,
} from "./createAIProvider";

import {
    markContentGenerationCompleted,
    markContentGenerationFailed,
} from "./contentGenerationRequests";

export interface ProcessGeneratedAIContentAuth {
    uid: string;
}

export interface ProcessGeneratedAIContentData {
    requestId: string;
    content: unknown;
    context?: Record<string, unknown>;
}

export interface ProcessGeneratedAIContentResult {
    success: true;
    requestId: string;
    content: unknown;
    validation: AIContentValidationResult;
}

export async function processGeneratedAIContentHandler(
    data: ProcessGeneratedAIContentData,
    auth: ProcessGeneratedAIContentAuth | null,
): Promise<ProcessGeneratedAIContentResult> {
    if (!auth) {
        throw new HttpsError(
            "unauthenticated",
            "Debes estar autenticado.",
        );
    }

    if (!data || typeof data !== "object") {
        throw new HttpsError(
            "invalid-argument",
            "Los datos son obligatorios.",
        );
    }

    if (
        typeof data.requestId !== "string" ||
        data.requestId.trim() === ""
    ) {
        throw new HttpsError(
            "invalid-argument",
            "El requestId es obligatorio.",
        );
    }

    if (
        data.content === undefined ||
        data.content === null
    ) {
        throw new HttpsError(
            "invalid-argument",
            "El contenido es obligatorio.",
        );
    }

    if (
        data.context !== undefined &&
        (
            typeof data.context !== "object" ||
            data.context === null ||
            Array.isArray(data.context)
        )
    ) {
        throw new HttpsError(
            "invalid-argument",
            "El contexto debe ser un objeto.",
        );
    }

    const provider = createAIProvider();

    try {
        const validation =
            await provider.validateContent(
                data.content,
                data.context,
            );

        if (!validation.valid) {
            const errorMessage =
                validation.errors.length > 0
                    ? validation.errors.join("; ")
                    : "El contenido generado no es válido.";

            await markContentGenerationFailed(
                data.requestId.trim(),
                errorMessage,
                auth,
            );

            throw new HttpsError(
                "invalid-argument",
                "El contenido generado no superó la validación.",
            );
        }

        const normalizedContent =
            validation.normalizedContent ??
            data.content;

        await markContentGenerationCompleted(
            data.requestId.trim(),
            normalizedContent,
            auth,
        );

        return {
            success: true,
            requestId: data.requestId.trim(),
            content: normalizedContent,
            validation,
        };
    } catch (error) {
        if (error instanceof HttpsError) {
            throw error;
        }

        const message =
            error instanceof Error
                ? error.message
                : "Error desconocido al validar contenido.";

        await markContentGenerationFailed(
            data.requestId.trim(),
            message,
            auth,
        );

        throw new HttpsError(
            "internal",
            "No fue posible validar el contenido generado.",
        );
    }
}
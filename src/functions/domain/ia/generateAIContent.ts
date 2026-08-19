import { HttpsError } from "firebase-functions/v2/https";

import {
    createAIProvider,
} from "./createAIProvider";

import {
    createContentGenerationRequest,
    markContentGenerationCompleted,
    markContentGenerationFailed,
} from "./contentGenerationRequests";

export interface GenerateAIContentData {
    type: string;
    subjectId?: string;
    topicId?: string;
    activityId?: string;
    prompt: string;
    parameters?: Record<string, unknown>;
}

export interface GenerateAIContentAuth {
    uid: string;
}

export interface GenerateAIContentResult {
    success: true;
    requestId: string;
    content: unknown;
    provider: string;
    model: string;
}

export async function generateAIContentHandler(
    data: GenerateAIContentData,
    auth: GenerateAIContentAuth | null,
): Promise<GenerateAIContentResult> {
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
        typeof data.type !== "string" ||
        data.type.trim() === ""
    ) {
        throw new HttpsError(
            "invalid-argument",
            "El tipo de contenido es obligatorio.",
        );
    }

    if (
        typeof data.prompt !== "string" ||
        data.prompt.trim() === ""
    ) {
        throw new HttpsError(
            "invalid-argument",
            "El prompt es obligatorio.",
        );
    }

    if (
        data.parameters !== undefined &&
        (
            typeof data.parameters !== "object" ||
            data.parameters === null ||
            Array.isArray(data.parameters)
        )
    ) {
        throw new HttpsError(
            "invalid-argument",
            "Los parámetros deben ser un objeto.",
        );
    }

    const requestId =
        await createContentGenerationRequest(
            {
                userId: auth.uid,
                type: data.type.trim(),
                subjectId: data.subjectId,
                topicId: data.topicId,
                activityId: data.activityId,
                prompt: data.prompt.trim(),
                parameters: data.parameters ?? {},
            },
            auth,
        );

    try {
        const provider = createAIProvider();

        const generationResult =
            await provider.generateContent({
                type: data.type.trim(),
                context: {
                    subjectId: data.subjectId,
                    topicId: data.topicId,
                    activityId: data.activityId,
                    prompt: data.prompt.trim(),
                    parameters: data.parameters ?? {},
                },
            });

        if (
            !generationResult ||
            generationResult.content === null ||
            generationResult.content === undefined
        ) {
            throw new Error(
                "El proveedor de IA no devolvió contenido.",
            );
        }

        await markContentGenerationCompleted(
            requestId,
            generationResult.content,
            auth,
        );

        return {
            success: true,
            requestId,
            content: generationResult.content,
            provider: generationResult.provider,
            model: generationResult.model,
        };
    } catch (error) {
        const message =
            error instanceof Error
                ? error.message
                : "Error desconocido al generar contenido.";

        await markContentGenerationFailed(
            requestId,
            message,
            auth,
        );

        if (error instanceof HttpsError) {
            throw error;
        }

        throw new HttpsError(
            "internal",
            "No fue posible generar el contenido con IA.",
        );
    }
}
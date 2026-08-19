import { getFirestore } from "firebase-admin/firestore";
import { HttpsError } from "firebase-functions/v2/https";

export interface GenerateAIContentData {
    type: string;
    topic: string;
    difficulty?: string;
    language?: string;
    quantity?: number;
    instructions?: string;
}

export interface GenerateAIContentAuth {
    uid: string;
}

export interface GenerateAIContentResult {
    success: boolean;
    requestId: string;
    content: unknown;
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

    if (
        !data ||
        typeof data.type !== "string" ||
        data.type.trim() === ""
    ) {
        throw new HttpsError(
            "invalid-argument",
            "El tipo de contenido es obligatorio.",
        );
    }

    if (
        typeof data.topic !== "string" ||
        data.topic.trim() === ""
    ) {
        throw new HttpsError(
            "invalid-argument",
            "El tema es obligatorio.",
        );
    }

    if (
        data.quantity !== undefined &&
        (
            !Number.isInteger(data.quantity) ||
            data.quantity < 1 ||
            data.quantity > 100
        )
    ) {
        throw new HttpsError(
            "invalid-argument",
            "La cantidad debe ser un entero entre 1 y 100.",
        );
    }

    const db = getFirestore();

    const requestRef = db
        .collection("contentGenerationRequests")
        .doc();

    const requestId = requestRef.id;

    const request = {
        requestId,
        requestedBy: auth.uid,
        type: data.type.trim(),
        topic: data.topic.trim(),
        ...(data.difficulty
            ? { difficulty: data.difficulty.trim() }
            : {}),
        ...(data.language
            ? { language: data.language.trim() }
            : {}),
        ...(data.quantity !== undefined
            ? { quantity: data.quantity }
            : {}),
        ...(data.instructions
            ? { instructions: data.instructions.trim() }
            : {}),
        status: "pending",
        provider: "gemini",
        createdAt: new Date(),
    };

    await requestRef.create(request);

    /*
     * La generación real mediante Gemini se conecta posteriormente
     * mediante AIProvider.
     *
     * Nunca se persiste contenido generado directamente como válido.
     * Primero debe pasar por validateAIContent.
     */
    return {
        success: true,
        requestId,
        content: null,
    };
}
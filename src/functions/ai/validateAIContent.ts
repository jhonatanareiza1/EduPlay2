import { getFirestore } from "firebase-admin/firestore";
import { HttpsError } from "firebase-functions/v2/https";

export interface ValidateAIContentData {
    requestId: string;
    content: unknown;
}

export interface ValidateAIContentAuth {
    uid: string;
}

export interface ValidateAIContentResult {
    success: boolean;
    requestId: string;
    valid: boolean;
}

export async function validateAIContentHandler(
    data: ValidateAIContentData,
    auth: ValidateAIContentAuth | null,
): Promise<ValidateAIContentResult> {
    if (!auth) {
        throw new HttpsError(
            "unauthenticated",
            "Debes estar autenticado.",
        );
    }

    if (
        !data ||
        typeof data.requestId !== "string" ||
        data.requestId.trim() === ""
    ) {
        throw new HttpsError(
            "invalid-argument",
            "El requestId es obligatorio.",
        );
    }

    if (
        data.content === null ||
        data.content === undefined
    ) {
        throw new HttpsError(
            "invalid-argument",
            "El contenido es obligatorio.",
        );
    }

    const db = getFirestore();

    const requestRef = db
        .collection("contentGenerationRequests")
        .doc(data.requestId);

    const requestSnap = await requestRef.get();

    if (!requestSnap.exists) {
        throw new HttpsError(
            "not-found",
            "La solicitud de generación no existe.",
        );
    }

    const request = requestSnap.data();

    if (request?.requestedBy !== auth.uid) {
        throw new HttpsError(
            "permission-denied",
            "No puedes validar contenido de otro usuario.",
        );
    }

    /*
     * Validación inicial del contenido.
     *
     * Esta capa se ampliará posteriormente con:
     * - esquema del tipo de contenido
     * - validación estructural
     * - seguridad
     * - contenido vacío
     * - consistencia
     * - validación específica del proveedor IA
     */

    const valid =
        typeof data.content === "object" ||
        typeof data.content === "string";

    if (!valid) {
        await requestRef.update({
            status: "rejected",
            validation: {
                valid: false,
                validatedBy: auth.uid,
                validatedAt: new Date(),
            },
        });

        return {
            success: true,
            requestId: data.requestId,
            valid: false,
        };
    }

    await requestRef.update({
        status: "validated",
        generatedContent: data.content,
        validation: {
            valid: true,
            validatedBy: auth.uid,
            validatedAt: new Date(),
        },
    });

    return {
        success: true,
        requestId: data.requestId,
        valid: true,
    };
}
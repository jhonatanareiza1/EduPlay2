import {
    FieldValue,
    getFirestore,
} from "firebase-admin/firestore";

import {
    getApps,
    initializeApp,
} from "firebase-admin/app";

import { HttpsError } from "firebase-functions/v2/https";

export interface CreateContentGenerationRequestData {
    userId: string;
    type: string;
    prompt: string;
    subjectId?: string;
    topicId?: string;
    activityId?: string;
    parameters: Record<string, unknown>;
}

export interface ContentGenerationRequestAuth {
    uid: string;
}

export interface ContentGenerationRequest {
    userId: string;
    type: string;
    prompt: string;
    subjectId?: string;
    topicId?: string;
    activityId?: string;
    parameters: Record<string, unknown>;
    status: "pending" | "completed" | "failed";
    content?: unknown;
    error?: string;
    createdAt: FirebaseFirestore.FieldValue;
    updatedAt: FirebaseFirestore.FieldValue;
}

if (getApps().length === 0) {
    initializeApp({
        projectId:
            process.env.GCLOUD_PROJECT ?? "eduplay-test",
    });
}

const db = getFirestore();

function requireAuth(
    auth: ContentGenerationRequestAuth | null,
): asserts auth is ContentGenerationRequestAuth {
    if (!auth || typeof auth.uid !== "string" || auth.uid.trim() === "") {
        throw new HttpsError(
            "unauthenticated",
            "Debes estar autenticado.",
        );
    }
}

function validateRequestData(
    data: CreateContentGenerationRequestData,
): void {
    if (!data || typeof data !== "object") {
        throw new HttpsError(
            "invalid-argument",
            "Los datos de la solicitud son obligatorios.",
        );
    }

    if (
        typeof data.userId !== "string" ||
        data.userId.trim() === ""
    ) {
        throw new HttpsError(
            "invalid-argument",
            "El usuario es obligatorio.",
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
        !data.parameters ||
        typeof data.parameters !== "object" ||
        Array.isArray(data.parameters)
    ) {
        throw new HttpsError(
            "invalid-argument",
            "Los parámetros deben ser un objeto.",
        );
    }
}

export async function createContentGenerationRequest(
    data: CreateContentGenerationRequestData,
    auth: ContentGenerationRequestAuth | null,
): Promise<string> {
    requireAuth(auth);
    validateRequestData(data);

    if (data.userId !== auth.uid) {
        throw new HttpsError(
            "permission-denied",
            "No puedes crear una solicitud para otro usuario.",
        );
    }

    const ref = db
        .collection("contentGenerationRequests")
        .doc();

    const request: ContentGenerationRequest = {
        userId: auth.uid,
        type: data.type.trim(),
        prompt: data.prompt.trim(),
        parameters: data.parameters,
        status: "pending",
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
    };

    if (
        typeof data.subjectId === "string" &&
        data.subjectId.trim() !== ""
    ) {
        request.subjectId = data.subjectId.trim();
    }

    if (
        typeof data.topicId === "string" &&
        data.topicId.trim() !== ""
    ) {
        request.topicId = data.topicId.trim();
    }

    if (
        typeof data.activityId === "string" &&
        data.activityId.trim() !== ""
    ) {
        request.activityId = data.activityId.trim();
    }

    await ref.set(request);

    return ref.id;
}

export async function updateContentGenerationRequest(
    requestId: string,
    status: "pending" | "completed" | "failed",
    auth: ContentGenerationRequestAuth | null,
    content?: unknown,
    error?: string,
): Promise<void> {
    requireAuth(auth);

    if (
        typeof requestId !== "string" ||
        requestId.trim() === ""
    ) {
        throw new HttpsError(
            "invalid-argument",
            "El requestId es obligatorio.",
        );
    }

    if (
        status !== "pending" &&
        status !== "completed" &&
        status !== "failed"
    ) {
        throw new HttpsError(
            "invalid-argument",
            "Estado de solicitud inválido.",
        );
    }

    const ref = db
        .collection("contentGenerationRequests")
        .doc(requestId.trim());

    const snapshot = await ref.get();

    if (!snapshot.exists) {
        throw new HttpsError(
            "not-found",
            "La solicitud de generación no existe.",
        );
    }

    const existing =
        snapshot.data() as ContentGenerationRequest;

    if (existing.userId !== auth.uid) {
        throw new HttpsError(
            "permission-denied",
            "No puedes modificar esta solicitud.",
        );
    }

    const updateData: Record<string, unknown> = {
        status,
        updatedAt: FieldValue.serverTimestamp(),
    };

    if (status === "completed") {
        updateData.content = content;
        updateData.error = FieldValue.delete();
    }

    if (status === "failed") {
        updateData.error =
            typeof error === "string"
                ? error
                : "Error desconocido.";
    }

    await ref.update(updateData);
}

export async function markContentGenerationCompleted(
    requestId: string,
    content: unknown,
    auth: ContentGenerationRequestAuth | null,
): Promise<void> {
    await updateContentGenerationRequest(
        requestId,
        "completed",
        auth,
        content,
    );
}

export async function markContentGenerationFailed(
    requestId: string,
    error: string,
    auth: ContentGenerationRequestAuth | null,
): Promise<void> {
    await updateContentGenerationRequest(
        requestId,
        "failed",
        auth,
        undefined,
        error,
    );
}

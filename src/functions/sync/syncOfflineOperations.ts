import { getApps, initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { HttpsError } from "firebase-functions/v2/https";

process.env.FIRESTORE_EMULATOR_HOST ??= "127.0.0.1:8081";
const projectId =
    process.env.GCLOUD_PROJECT ?? "eduplay-test";

if (getApps().length === 0) {
    initializeApp({
        projectId,
    });
}

export interface OfflineOperation {
    operationId: string;
    type: string;
    data: Record<string, unknown>;
}

export interface SyncOfflineOperationsData {
    operations: OfflineOperation[];
}

export interface SyncOfflineOperationsAuth {
    uid: string;
}

export async function syncOfflineOperationsHandler(
    data: SyncOfflineOperationsData,
    auth: SyncOfflineOperationsAuth | null,
) {
    if (!auth) {
        throw new HttpsError(
            "unauthenticated",
            "Debes estar autenticado.",
        );
    }

    if (
        !data ||
        !Array.isArray(data.operations)
    ) {
        throw new HttpsError(
            "invalid-argument",
            "operations debe ser un arreglo.",
        );
    }

    if (data.operations.length === 0) {
        return {
            success: true,
            processed: 0,
            results: [],
        };
    }

    const db = getFirestore();

    const results: Array<{
        operationId: string;
        status: "processed" | "already-processed";
    }> = [];

    for (const operation of data.operations) {
        if (
            !operation ||
            typeof operation.operationId !== "string" ||
            operation.operationId.trim() === ""
        ) {
            throw new HttpsError(
                "invalid-argument",
                "Cada operación debe tener un operationId válido.",
            );
        }

        if (
            typeof operation.type !== "string" ||
            operation.type.trim() === ""
        ) {
            throw new HttpsError(
                "invalid-argument",
                "Cada operación debe tener un type válido.",
            );
        }

        if (
            !operation.data ||
            typeof operation.data !== "object" ||
            Array.isArray(operation.data)
        ) {
            throw new HttpsError(
                "invalid-argument",
                "Cada operación debe tener data válida.",
            );
        }

        const operationRef = db
            .collection("offlineOperations")
            .doc(`${auth.uid}_${operation.operationId}`);

        const existingOperation =
            await operationRef.get();

        if (existingOperation.exists) {
            results.push({
                operationId: operation.operationId,
                status: "already-processed",
            });

            continue;
        }

        await operationRef.create({
            operationId: operation.operationId,
            userId: auth.uid,
            type: operation.type,
            data: operation.data,
            processedAt: new Date(),
        });

        results.push({
            operationId: operation.operationId,
            status: "processed",
        });
    }

    return {
        success: true,
        processed: results.length,
        results,
    };
}
import {
    getApps,
    initializeApp,
} from "firebase-admin/app";

import {
    getFirestore,
} from "firebase-admin/firestore";

import {
    HttpsError,
} from "firebase-functions/v2/https";

process.env.FIRESTORE_EMULATOR_HOST ??=
    "127.0.0.1:8081";

const projectId =
    process.env.GCLOUD_PROJECT
    ?? "eduplay-test";

if (getApps().length === 0) {
    initializeApp({
        projectId,
    });
}

export interface UpdateFamilyData {
    familyId: string;
    name: string;
}

export interface UpdateFamilyAuth {
    uid: string;
}

export interface UpdateFamilyResult {
    success: true;
    familyId: string;
    name: string;
    ownerUserId: string;
}

export async function updateFamilyHandler(
    data: UpdateFamilyData,
    auth: UpdateFamilyAuth | null,
): Promise<UpdateFamilyResult> {
    if (!auth) {
        throw new HttpsError(
            "unauthenticated",
            "Debes estar autenticado.",
        );
    }

    if (
        !data
        || typeof data.familyId !== "string"
        || data.familyId.trim() === ""
    ) {
        throw new HttpsError(
            "invalid-argument",
            "familyId es obligatorio.",
        );
    }

    if (
        typeof data.name !== "string"
        || data.name.trim() === ""
    ) {
        throw new HttpsError(
            "invalid-argument",
            "El nombre de la familia es obligatorio.",
        );
    }

    const db =
        getFirestore();

    const familyReference =
        db
            .collection("families")
            .doc(data.familyId);

    const familySnapshot =
        await familyReference.get();

    if (!familySnapshot.exists) {
        throw new HttpsError(
            "not-found",
            "La familia no existe.",
        );
    }

    const familyData =
        familySnapshot.data();

    if (
        familyData?.ownerUserId !==
        auth.uid
    ) {
        throw new HttpsError(
            "permission-denied",
            "Solo el padre propietario puede modificar la familia.",
        );
    }

    const name =
        data.name.trim();

    const updatedAt =
        new Date();

    await familyReference.update({
        name,
        updatedAt,
    });

    return {
        success: true,
        familyId:
            data.familyId,
        name,
        ownerUserId:
            familyData.ownerUserId as string,
    };
}
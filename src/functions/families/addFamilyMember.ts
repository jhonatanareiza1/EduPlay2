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

export interface AddFamilyMemberData {
    familyId: string;
    userId: string;
    role: "parent" | "child";
}

export interface AddFamilyMemberAuth {
    uid: string;
}

export interface AddFamilyMemberResult {
    success: true;
    memberId: string;
    familyId: string;
    userId: string;
    role: "parent" | "child";
}

export async function addFamilyMemberHandler(
    data: AddFamilyMemberData,
    auth: AddFamilyMemberAuth | null,
): Promise<AddFamilyMemberResult> {
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
        typeof data.userId !== "string"
        || data.userId.trim() === ""
    ) {
        throw new HttpsError(
            "invalid-argument",
            "userId es obligatorio.",
        );
    }

    if (
        data.role !== "parent"
        && data.role !== "child"
    ) {
        throw new HttpsError(
            "invalid-argument",
            "El rol debe ser parent o child.",
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
            "Solo el padre propietario puede agregar miembros.",
        );
    }

    const userReference =
        db
            .collection("users")
            .doc(data.userId);

    const userSnapshot =
        await userReference.get();

    if (!userSnapshot.exists) {
        throw new HttpsError(
            "not-found",
            "El usuario que se quiere agregar no existe.",
        );
    }

    const memberId =
        `${data.familyId}_${data.userId}`;

    const memberReference =
        db
            .collection("familyMembers")
            .doc(memberId);

    const existingMemberSnapshot =
        await memberReference.get();

    if (existingMemberSnapshot.exists) {
        throw new HttpsError(
            "already-exists",
            "El usuario ya pertenece a esta familia.",
        );
    }

    const createdAt =
        new Date();

    await memberReference.create({
        familyId:
            data.familyId,

        userId:
            data.userId,

        role:
            data.role,

        status:
            "active",

        createdAt,

        updatedAt:
            createdAt,
    });

    return {
        success: true,

        memberId,

        familyId:
            data.familyId,

        userId:
            data.userId,

        role:
            data.role,
    };
}
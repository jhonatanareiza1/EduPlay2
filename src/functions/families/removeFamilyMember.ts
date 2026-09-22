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

export interface RemoveFamilyMemberData {
    memberId: string;
}

export interface RemoveFamilyMemberAuth {
    uid: string;
}

export interface RemoveFamilyMemberResult {
    success: true;
    memberId: string;
    familyId: string;
    userId: string;
}

export async function removeFamilyMemberHandler(
    data: RemoveFamilyMemberData,
    auth: RemoveFamilyMemberAuth | null,
): Promise<RemoveFamilyMemberResult> {
    if (!auth) {
        throw new HttpsError(
            "unauthenticated",
            "Debes estar autenticado.",
        );
    }

    if (
        !data
        || typeof data.memberId !== "string"
        || data.memberId.trim() === ""
    ) {
        throw new HttpsError(
            "invalid-argument",
            "memberId es obligatorio.",
        );
    }

    const db =
        getFirestore();

    const memberReference =
        db
            .collection("familyMembers")
            .doc(data.memberId);

    const memberSnapshot =
        await memberReference.get();

    if (!memberSnapshot.exists) {
        throw new HttpsError(
            "not-found",
            "El miembro de familia no existe.",
        );
    }

    const memberData =
        memberSnapshot.data();

    const familyId =
        memberData?.familyId;

    if (
        typeof familyId !== "string"
        || familyId.trim() === ""
    ) {
        throw new HttpsError(
            "failed-precondition",
            "El miembro no tiene una familia válida.",
        );
    }

    const familyReference =
        db
            .collection("families")
            .doc(familyId);

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
            "Solo el padre propietario puede eliminar miembros de la familia.",
        );
    }

    await memberReference.delete();

    return {
        success: true,
        memberId:
            data.memberId,
        familyId,
        userId:
            memberData?.userId as string,
    };
}
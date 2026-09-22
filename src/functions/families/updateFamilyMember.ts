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

export interface UpdateFamilyMemberData {
    memberId: string;
    status: "active" | "inactive";
}

export interface UpdateFamilyMemberAuth {
    uid: string;
}

export interface UpdateFamilyMemberResult {
    success: true;
    memberId: string;
    familyId: string;
    userId: string;
    status: "active" | "inactive";
}

export async function updateFamilyMemberHandler(
    data: UpdateFamilyMemberData,
    auth: UpdateFamilyMemberAuth | null,
): Promise<UpdateFamilyMemberResult> {
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

    if (
        data.status !== "active"
        && data.status !== "inactive"
    ) {
        throw new HttpsError(
            "invalid-argument",
            "El estado debe ser active o inactive.",
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
            "Solo el padre propietario puede actualizar miembros de la familia.",
        );
    }

    const updatedAt =
        new Date();

    await memberReference.update({
        status:
            data.status,

        updatedAt,
    });

    return {
        success: true,
        memberId:
            data.memberId,
        familyId,
        userId:
            memberData?.userId as string,
        status:
            data.status,
    };
}
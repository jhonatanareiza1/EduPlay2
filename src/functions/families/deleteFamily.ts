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

export interface DeleteFamilyData {
    familyId: string;
}

export interface DeleteFamilyAuth {
    uid: string;
}

export interface DeleteFamilyResult {
    success: true;
    familyId: string;
}

export async function deleteFamilyHandler(
    data: DeleteFamilyData,
    auth: DeleteFamilyAuth | null,
): Promise<DeleteFamilyResult> {
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
            "Solo el padre propietario puede eliminar la familia.",
        );
    }

    const membersSnapshot =
        await db
            .collection("familyMembers")
            .where(
                "familyId",
                "==",
                data.familyId,
            )
            .get();

    await db.runTransaction(
        async (transaction) => {
            for (
                const member
                of membersSnapshot.docs
            ) {
                transaction.delete(
                    member.ref,
                );
            }

            transaction.delete(
                familyReference,
            );
        },
    );

    return {
        success: true,
        familyId:
            data.familyId,
    };
}
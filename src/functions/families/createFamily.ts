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

export interface CreateFamilyData {
    name: string;
}

export interface CreateFamilyAuth {
    uid: string;
}

export interface CreateFamilyResult {
    success: true;
    familyId: string;
    name: string;
    ownerUserId: string;
}

export async function createFamilyHandler(
    data: CreateFamilyData,
    auth: CreateFamilyAuth | null,
): Promise<CreateFamilyResult> {
    if (!auth) {
        throw new HttpsError(
            "unauthenticated",
            "Debes estar autenticado.",
        );
    }

    if (
        !data
        || typeof data.name !== "string"
        || data.name.trim() === ""
    ) {
        throw new HttpsError(
            "invalid-argument",
            "El nombre de la familia es obligatorio.",
        );
    }

    const db =
        getFirestore();

    const userReference =
        db
            .collection("users")
            .doc(auth.uid);

    const userSnapshot =
        await userReference.get();

    if (!userSnapshot.exists) {
        throw new HttpsError(
            "not-found",
            "El usuario no existe.",
        );
    }

    if (
        userSnapshot.data()?.role !==
        "parent"
    ) {
        throw new HttpsError(
            "permission-denied",
            "Solo un padre puede crear una familia.",
        );
    }

    const familyReference =
        db
            .collection("families")
            .doc();

    const familyMemberReference =
        db
            .collection("familyMembers")
            .doc(
                `${familyReference.id}_${auth.uid}`,
            );

    const createdAt =
        new Date();

    await db.runTransaction(
        async (transaction) => {
            transaction.create(
                familyReference,
                {
                    name:
                        data.name.trim(),

                    ownerUserId:
                        auth.uid,

                    createdAt,

                    updatedAt:
                        createdAt,
                },
            );

            transaction.create(
                familyMemberReference,
                {
                    familyId:
                        familyReference.id,

                    userId:
                        auth.uid,

                    role:
                        "parent",

                    status:
                        "active",

                    createdAt,

                    updatedAt:
                        createdAt,
                },
            );
        },
    );

    return {
        success: true,
        familyId:
            familyReference.id,
        name:
            data.name.trim(),
        ownerUserId:
            auth.uid,
    };
}
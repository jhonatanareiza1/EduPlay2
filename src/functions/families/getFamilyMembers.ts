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

export interface GetFamilyMembersData {
    familyId: string;
}

export interface GetFamilyMembersAuth {
    uid: string;
}

export interface GetFamilyMember {
    id: string;
    familyId: string;
    userId: string;
    role: "parent" | "child";
    status: string;
    createdAt: unknown;
    updatedAt: unknown;
}

export interface GetFamilyMembersResult {
    success: true;
    familyId: string;
    members: GetFamilyMember[];
}

export async function getFamilyMembersHandler(
    data: GetFamilyMembersData,
    auth: GetFamilyMembersAuth | null,
): Promise<GetFamilyMembersResult> {
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

    const ownerUserId =
        familyData?.ownerUserId;

    const ownMemberReference =
        db
            .collection("familyMembers")
            .doc(
                `${data.familyId}_${auth.uid}`,
            );

    const ownMemberSnapshot =
        await ownMemberReference.get();

    if (
        ownerUserId !== auth.uid
        && !ownMemberSnapshot.exists
    ) {
        throw new HttpsError(
            "permission-denied",
            "No perteneces a esta familia.",
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

    const members =
        membersSnapshot.docs.map(
            (document) => {
                const memberData =
                    document.data();

                return {
                    id:
                        document.id,

                    familyId:
                        memberData.familyId,

                    userId:
                        memberData.userId,

                    role:
                        memberData.role,

                    status:
                        memberData.status,

                    createdAt:
                        memberData.createdAt,

                    updatedAt:
                        memberData.updatedAt,
                };
            },
        );

    return {
        success: true,
        familyId:
            data.familyId,
        members,
    };
}
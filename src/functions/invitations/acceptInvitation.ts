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

export interface AcceptInvitationData {
    invitationId: string;
}

export interface AcceptInvitationAuth {
    uid: string;
}

export async function acceptInvitationHandler(
    data: AcceptInvitationData,
    auth: AcceptInvitationAuth | null,
) {
    if (!auth) {
        throw new HttpsError(
            "unauthenticated",
            "Debes estar autenticado.",
        );
    }

    const { invitationId } = data;

    if (
        typeof invitationId !== "string" ||
        invitationId.trim() === ""
    ) {
        throw new HttpsError(
            "invalid-argument",
            "El invitationId es obligatorio.",
        );
    }

    const db = getFirestore();

    const invitationRef = db
        .collection("invitations")
        .doc(invitationId);

    const invitationSnap = await invitationRef.get();

    if (!invitationSnap.exists) {
        throw new HttpsError(
            "not-found",
            "La invitación no existe.",
        );
    }

    const invitation = invitationSnap.data();

    if (!invitation) {
        throw new HttpsError(
            "not-found",
            "La invitación no existe.",
        );
    }

    if (invitation.invitedUserId !== auth.uid) {
        throw new HttpsError(
            "permission-denied",
            "No puedes aceptar esta invitación.",
        );
    }

    if (invitation.status === "accepted") {
        throw new HttpsError(
            "already-exists",
            "La invitación ya fue aceptada.",
        );
    }

    if (invitation.status === "rejected") {
        throw new HttpsError(
            "failed-precondition",
            "La invitación fue rechazada.",
        );
    }

    if (
        invitation.expiresAt &&
        typeof invitation.expiresAt.toMillis === "function" &&
        invitation.expiresAt.toMillis() < Date.now()
    ) {
        throw new HttpsError(
            "deadline-exceeded",
            "La invitación ha expirado.",
        );
    }

    const acceptedAt = new Date();

    if (invitation.type === "family") {
        if (
            typeof invitation.familyId !== "string" ||
            invitation.familyId.trim() === ""
        ) {
            throw new HttpsError(
                "invalid-argument",
                "La invitación familiar no tiene familyId.",
            );
        }

        const familyRef = db
            .collection("families")
            .doc(invitation.familyId);

        const familyMemberRef = db
            .collection("familyMembers")
            .doc(
                `${invitation.familyId}_${auth.uid}`,
            );

        await db.runTransaction(
            async (transaction) => {
                const familySnap =
                    await transaction.get(
                        familyRef,
                    );

                if (!familySnap.exists) {
                    throw new HttpsError(
                        "not-found",
                        "La familia no existe.",
                    );
                }

                transaction.update(
                    invitationRef,
                    {
                        status:
                            "accepted",
                        acceptedAt,
                    },
                );

                transaction.create(
                    familyMemberRef,
                    {
                        familyId:
                            invitation.familyId,

                        userId:
                            auth.uid,

                        role:
                            "child",

                        status:
                            "active",

                        createdAt:
                            acceptedAt,

                        updatedAt:
                            acceptedAt,
                    },
                );
            },
        );
    } else {
        await invitationRef.update({
            status: "accepted",
            acceptedAt,
        });
    }

    return {
        success: true,
        invitationId,
        status: "accepted",
    };
}
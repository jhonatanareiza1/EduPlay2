import { getApps, initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { HttpsError } from "firebase-functions/v2/https";

process.env.FIRESTORE_EMULATOR_HOST ??= "127.0.0.1:8081";
process.env.GCLOUD_PROJECT ??= "eduplay-test";

if (getApps().length === 0) {
    initializeApp({
        projectId: "eduplay-test",
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

    await invitationRef.update({
        status: "accepted",
        acceptedAt,
    });

    return {
        success: true,
        invitationId,
        status: "accepted",
    };
}
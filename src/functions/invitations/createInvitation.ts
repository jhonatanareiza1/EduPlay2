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

export interface CreateInvitationData {
    invitedUserId: string;
    type: "family" | "group";
    familyId?: string;
    groupId?: string;
}

export interface CreateInvitationAuth {
    uid: string;
}

export async function createInvitationHandler(
    data: CreateInvitationData,
    auth: CreateInvitationAuth | null,
) {
    if (!auth) {
        throw new HttpsError(
            "unauthenticated",
            "Debes estar autenticado.",
        );
    }

    const {
        invitedUserId,
        type,
        familyId,
        groupId,
    } = data;

    if (
        typeof invitedUserId !== "string" ||
        invitedUserId.trim() === ""
    ) {
        throw new HttpsError(
            "invalid-argument",
            "invitedUserId es obligatorio.",
        );
    }

    if (type !== "family" && type !== "group") {
        throw new HttpsError(
            "invalid-argument",
            "El tipo de invitación no es válido.",
        );
    }

    if (invitedUserId === auth.uid) {
        throw new HttpsError(
            "invalid-argument",
            "No puedes invitarte a ti mismo.",
        );
    }

    if (type === "family") {
        if (
            typeof familyId !== "string" ||
            familyId.trim() === ""
        ) {
            throw new HttpsError(
                "invalid-argument",
                "familyId es obligatorio para una invitación familiar.",
            );
        }
    }

    if (type === "group") {
        if (
            typeof groupId !== "string" ||
            groupId.trim() === ""
        ) {
            throw new HttpsError(
                "invalid-argument",
                "groupId es obligatorio para una invitación de grupo.",
            );
        }
    }

    const db = getFirestore();

    const inviterRef = db
        .collection("users")
        .doc(auth.uid);

    const invitedUserRef = db
        .collection("users")
        .doc(invitedUserId);

    const [inviterSnap, invitedUserSnap] = await Promise.all([
        inviterRef.get(),
        invitedUserRef.get(),
    ]);

    if (!inviterSnap.exists) {
        throw new HttpsError(
            "not-found",
            "El usuario que crea la invitación no existe.",
        );
    }

    if (!invitedUserSnap.exists) {
        throw new HttpsError(
            "not-found",
            "El usuario invitado no existe.",
        );
    }

    const inviterRole = inviterSnap.data()?.role;

    if (type === "family" && inviterRole !== "parent") {
        throw new HttpsError(
            "permission-denied",
            "Solo un padre puede crear invitaciones familiares.",
        );
    }

    if (type === "group" && inviterRole !== "teacher") {
        throw new HttpsError(
            "permission-denied",
            "Solo un docente puede crear invitaciones de grupo.",
        );
    }

    if (type === "family") {
        const familyRef = db
            .collection("families")
            .doc(familyId!);

        const familySnap = await familyRef.get();

        if (!familySnap.exists) {
            throw new HttpsError(
                "not-found",
                "La familia no existe.",
            );
        }

        if (
            familySnap.data()?.ownerUserId !== auth.uid
        ) {
            throw new HttpsError(
                "permission-denied",
                "No eres propietario de esta familia.",
            );
        }
    }

    if (type === "group") {
        const groupRef = db
            .collection("groups")
            .doc(groupId!);

        const groupSnap = await groupRef.get();

        if (!groupSnap.exists) {
            throw new HttpsError(
                "not-found",
                "El grupo no existe.",
            );
        }

        if (
            groupSnap.data()?.ownerTeacherId !== auth.uid
        ) {
            throw new HttpsError(
                "permission-denied",
                "No eres propietario de este grupo.",
            );
        }
    }

    const existingSnapshot = await db
        .collection("invitations")
        .where("invitedUserId", "==", invitedUserId)
        .where("invitedByUserId", "==", auth.uid)
        .where("type", "==", type)
        .where("status", "==", "pending")
        .limit(1)
        .get();

    if (!existingSnapshot.empty) {
        throw new HttpsError(
            "already-exists",
            "Ya existe una invitación pendiente.",
        );
    }

    const invitationRef = db
        .collection("invitations")
        .doc();

    await invitationRef.create({
        invitedUserId,
        invitedByUserId: auth.uid,
        type,
        ...(familyId ? { familyId } : {}),
        ...(groupId ? { groupId } : {}),
        status: "pending",
        createdAt: new Date(),
    });

    return {
        success: true,
        invitationId: invitationRef.id,
    };
}
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

export interface JoinClassSessionData {
    sessionId: string;
}

export interface JoinClassSessionAuth {
    uid: string;
}

export async function joinClassSessionHandler(
    data: JoinClassSessionData,
    auth: JoinClassSessionAuth | null,
) {
    if (!auth) {
        throw new HttpsError(
            "unauthenticated",
            "Debes estar autenticado.",
        );
    }

    const { sessionId } = data;

    if (
        typeof sessionId !== "string" ||
        sessionId.trim() === ""
    ) {
        throw new HttpsError(
            "invalid-argument",
            "sessionId es obligatorio.",
        );
    }

    const db = getFirestore();

    const sessionRef = db
        .collection("classSessions")
        .doc(sessionId);

    const sessionSnap = await sessionRef.get();

    if (!sessionSnap.exists) {
        throw new HttpsError(
            "not-found",
            "La sesión no existe.",
        );
    }

    const session = sessionSnap.data();

    if (session?.status !== "active") {
        throw new HttpsError(
            "failed-precondition",
            "La sesión no está activa.",
        );
    }

    const groupId = session.groupId;

    if (
        typeof groupId !== "string" ||
        groupId.trim() === ""
    ) {
        throw new HttpsError(
            "failed-precondition",
            "La sesión no tiene un grupo válido.",
        );
    }

    const memberId = `${groupId}_${auth.uid}`;

    const memberRef = db
        .collection("groupMembers")
        .doc(memberId);

    const memberSnap = await memberRef.get();

    if (!memberSnap.exists) {
        throw new HttpsError(
            "permission-denied",
            "No perteneces al grupo de esta sesión.",
        );
    }

    const participantId = `${sessionId}_${auth.uid}`;

    const participantRef = db
        .collection("sessionParticipants")
        .doc(participantId);

    const existingParticipant =
        await participantRef.get();

    if (existingParticipant.exists) {
        return {
            success: true,
            participantId,
            alreadyJoined: true,
        };
    }

    await participantRef.create({
        sessionId,
        groupId,
        studentId: auth.uid,
        joinedAt: new Date(),
        status: "joined",
    });

    return {
        success: true,
        participantId,
        alreadyJoined: false,
    };
}
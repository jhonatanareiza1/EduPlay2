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

export interface CreateClassSessionData {
    groupId: string;
    title: string;
    activityId?: string;
}

export interface CreateClassSessionAuth {
    uid: string;
}

export async function createClassSessionHandler(
    data: CreateClassSessionData,
    auth: CreateClassSessionAuth | null,
) {
    if (!auth) {
        throw new HttpsError(
            "unauthenticated",
            "Debes estar autenticado.",
        );
    }

    const {
        groupId,
        title,
        activityId,
    } = data;

    if (
        typeof groupId !== "string" ||
        groupId.trim() === ""
    ) {
        throw new HttpsError(
            "invalid-argument",
            "groupId es obligatorio.",
        );
    }

    if (
        typeof title !== "string" ||
        title.trim() === ""
    ) {
        throw new HttpsError(
            "invalid-argument",
            "title es obligatorio.",
        );
    }

    const db = getFirestore();

    const groupRef = db
        .collection("groups")
        .doc(groupId);

    const groupSnap = await groupRef.get();

    if (!groupSnap.exists) {
        throw new HttpsError(
            "not-found",
            "El grupo no existe.",
        );
    }

    const group = groupSnap.data();

    if (
        group?.ownerTeacherId !== auth.uid
    ) {
        throw new HttpsError(
            "permission-denied",
            "Solo el docente propietario puede crear la sesión.",
        );
    }

    if (
        activityId !== undefined &&
        (
            typeof activityId !== "string" ||
            activityId.trim() === ""
        )
    ) {
        throw new HttpsError(
            "invalid-argument",
            "activityId no es válido.",
        );
    }

    if (activityId) {
        const activityRef = db
            .collection("activities")
            .doc(activityId);

        const activitySnap = await activityRef.get();

        if (!activitySnap.exists) {
            throw new HttpsError(
                "not-found",
                "La actividad no existe.",
            );
        }
    }

    const sessionRef = db
        .collection("classSessions")
        .doc();

    await sessionRef.create({
        groupId,
        teacherId: auth.uid,
        title: title.trim(),
        ...(activityId
            ? { activityId }
            : {}),
        status: "active",
        createdAt: new Date(),
    });

    return {
        success: true,
        sessionId: sessionRef.id,
    };
}
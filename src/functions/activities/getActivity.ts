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

export interface ActivityDocument {
    id: string;
    title: string;
    description?: string;
    type?: string;
    ownerTeacherId: string;
    subjectId?: string;
    topicId?: string;
    configId: string;
    isPublished?: boolean;
    createdAt?: unknown;
    updatedAt?: unknown;
}

export interface ActivityConfigDocument {
    id: string;
    activityId: string;
    ownerTeacherId: string;
    questions: Array<{
        id: string;
        type: string;
        text: string;
        options?: Array<{
            id: string;
            text: string;
        }>;
        points?: number;
        explanation?: string;
    }>;
    timeLimitSeconds?: number;
    shuffleQuestions?: boolean;
    shuffleOptions?: boolean;
    passingScore?: number;
}

export interface ActivityAnswerKeyDocument {
    id: string;
    activityId: string;
    ownerTeacherId: string;
    answers: Record<string, string | string[]>;
}

export interface LoadedActivity {
    activity: ActivityDocument;
    config: ActivityConfigDocument;
    answerKey: ActivityAnswerKeyDocument;
}

export async function getActivityForAttempt(
    activityId: string,
): Promise<LoadedActivity> {
    if (
        typeof activityId !== "string" ||
        activityId.trim() === ""
    ) {
        throw new HttpsError(
            "invalid-argument",
            "activityId es obligatorio.",
        );
    }

    const db = getFirestore();

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

    const activityData =
        activitySnap.data() as Record<string, unknown>;

    const ownerTeacherId =
        activityData.ownerTeacherId;

    if (typeof ownerTeacherId !== "string") {
        throw new HttpsError(
            "failed-precondition",
            "La actividad no tiene un docente propietario válido.",
        );
    }

    const configId = activityData.configId;

    if (
        typeof configId !== "string" ||
        configId.trim() === ""
    ) {
        throw new HttpsError(
            "failed-precondition",
            "La actividad no tiene una configuración válida.",
        );
    }

    const configRef = db
        .collection("activityConfigs")
        .doc(configId);

    const answerKeyRef = db
        .collection("activityAnswerKeys")
        .doc(activityId);

    const [configSnap, answerKeySnap] =
        await Promise.all([
            configRef.get(),
            answerKeyRef.get(),
        ]);

    if (!configSnap.exists) {
        throw new HttpsError(
            "not-found",
            "La configuración de la actividad no existe.",
        );
    }

    if (!answerKeySnap.exists) {
        throw new HttpsError(
            "failed-precondition",
            "La actividad no tiene respuestas correctas configuradas.",
        );
    }

    const configData =
        configSnap.data() as Record<string, unknown>;

    const answerKeyData =
        answerKeySnap.data() as Record<string, unknown>;

    if (configData.activityId !== activityId) {
        throw new HttpsError(
            "failed-precondition",
            "La configuración no pertenece a la actividad.",
        );
    }

    if (configData.ownerTeacherId !== ownerTeacherId) {
        throw new HttpsError(
            "failed-precondition",
            "La configuración pertenece a otro docente.",
        );
    }

    if (answerKeyData.activityId !== activityId) {
        throw new HttpsError(
            "failed-precondition",
            "Las respuestas correctas no pertenecen a la actividad.",
        );
    }

    if (answerKeyData.ownerTeacherId !== ownerTeacherId) {
        throw new HttpsError(
            "failed-precondition",
            "Las respuestas correctas pertenecen a otro docente.",
        );
    }

    if (
        !Array.isArray(configData.questions)
        || configData.questions.length === 0
    ) {
        throw new HttpsError(
            "failed-precondition",
            "La actividad no tiene preguntas.",
        );
    }

    if (
        !answerKeyData.answers
        || typeof answerKeyData.answers !== "object"
        || Array.isArray(answerKeyData.answers)
    ) {
        throw new HttpsError(
            "failed-precondition",
            "Las respuestas correctas tienen un formato inválido.",
        );
    }

    const activity: ActivityDocument = {
        id: activityId,
        title:
            typeof activityData.title === "string"
                ? activityData.title
                : "",
        ...(typeof activityData.description === "string"
            ? { description: activityData.description }
            : {}),
        ...(typeof activityData.type === "string"
            ? { type: activityData.type }
            : {}),
        ownerTeacherId,
        ...(typeof activityData.subjectId === "string"
            ? { subjectId: activityData.subjectId }
            : {}),
        ...(typeof activityData.topicId === "string"
            ? { topicId: activityData.topicId }
            : {}),
        configId,
        ...(typeof activityData.isPublished === "boolean"
            ? { isPublished: activityData.isPublished }
            : {}),
        ...(activityData.createdAt !== undefined
            ? { createdAt: activityData.createdAt }
            : {}),
        ...(activityData.updatedAt !== undefined
            ? { updatedAt: activityData.updatedAt }
            : {}),
    };

    const config: ActivityConfigDocument = {
        id: configId,
        activityId,
        ownerTeacherId,
        questions:
            configData.questions as ActivityConfigDocument["questions"],
        ...(typeof configData.timeLimitSeconds === "number"
            ? {
                timeLimitSeconds:
                    configData.timeLimitSeconds,
            }
            : {}),
        ...(typeof configData.shuffleQuestions === "boolean"
            ? {
                shuffleQuestions:
                    configData.shuffleQuestions,
            }
            : {}),
        ...(typeof configData.shuffleOptions === "boolean"
            ? {
                shuffleOptions:
                    configData.shuffleOptions,
            }
            : {}),
        ...(typeof configData.passingScore === "number"
            ? {
                passingScore:
                    configData.passingScore,
            }
            : {}),
    };

    const answerKey: ActivityAnswerKeyDocument = {
        id: activityId,
        activityId,
        ownerTeacherId,
        answers:
            answerKeyData.answers as Record<
                string,
                string | string[]
            >,
    };

    return {
        activity,
        config,
        answerKey,
    };
}
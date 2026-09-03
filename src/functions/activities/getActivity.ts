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
    process.env.GCLOUD_PROJECT ??
    "eduplay-test";

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
    answers: Record<
        string,
        string | string[]
    >;
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

    const db =
        getFirestore();

    const normalizedActivityId =
        activityId.trim();

    const activityRef =
        db
            .collection("activities")
            .doc(normalizedActivityId);

    const activitySnap =
        await activityRef.get();

    if (!activitySnap.exists) {
        throw new HttpsError(
            "not-found",
            "La actividad no existe.",
        );
    }

    const activityData =
        activitySnap.data() as Record<
            string,
            unknown
        >;

    const ownerTeacherId =
        activityData.ownerTeacherId;

    if (
        typeof ownerTeacherId !== "string" ||
        ownerTeacherId.trim() === ""
    ) {
        throw new HttpsError(
            "failed-precondition",
            "La actividad no tiene un docente propietario válido.",
        );
    }

    const isPublished =
        activityData.isPublished === true;

    if (!isPublished) {
        throw new HttpsError(
            "failed-precondition",
            "La actividad no está publicada.",
        );
    }

    const configId =
        activityData.configId;

    if (
        typeof configId !== "string" ||
        configId.trim() === ""
    ) {
        throw new HttpsError(
            "failed-precondition",
            "La actividad no tiene una configuración válida.",
        );
    }

    const configRef =
        db
            .collection("activityConfigs")
            .doc(configId);

    const answerKeyRef =
        db
            .collection("activityAnswerKeys")
            .doc(normalizedActivityId);

    const [
        configSnap,
        answerKeySnap,
    ] = await Promise.all([
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
        configSnap.data() as Record<
            string,
            unknown
        >;

    const answerKeyData =
        answerKeySnap.data() as Record<
            string,
            unknown
        >;

    if (
        configData.activityId !==
        normalizedActivityId
    ) {
        throw new HttpsError(
            "failed-precondition",
            "La configuración no pertenece a la actividad.",
        );
    }

    if (
        configData.ownerTeacherId !==
        ownerTeacherId
    ) {
        throw new HttpsError(
            "failed-precondition",
            "La configuración pertenece a otro docente.",
        );
    }

    if (
        answerKeyData.activityId !==
        normalizedActivityId
    ) {
        throw new HttpsError(
            "failed-precondition",
            "Las respuestas correctas no pertenecen a la actividad.",
        );
    }

    if (
        answerKeyData.ownerTeacherId !==
        ownerTeacherId
    ) {
        throw new HttpsError(
            "failed-precondition",
            "Las respuestas correctas pertenecen a otro docente.",
        );
    }

    if (
        !Array.isArray(
            configData.questions,
        )
    ) {
        throw new HttpsError(
            "failed-precondition",
            "La actividad no tiene preguntas válidas.",
        );
    }

    if (
        configData.questions.length === 0
    ) {
        throw new HttpsError(
            "failed-precondition",
            "La actividad no tiene preguntas.",
        );
    }

    const questions =
        configData.questions as
        ActivityConfigDocument["questions"];

    const answers =
        answerKeyData.answers;

    if (
        !answers ||
        typeof answers !== "object" ||
        Array.isArray(answers)
    ) {
        throw new HttpsError(
            "failed-precondition",
            "La clave de respuestas no es válida.",
        );
    }

    return {
        activity: {
            id:
                activitySnap.id,

            title:
                activityData.title as string,

            description:
                activityData.description as
                string | undefined,

            type:
                activityData.type as
                string | undefined,

            ownerTeacherId,

            subjectId:
                activityData.subjectId as
                string | undefined,

            topicId:
                activityData.topicId as
                string | undefined,

            configId,

            isPublished:
                true,

            createdAt:
                activityData.createdAt,

            updatedAt:
                activityData.updatedAt,
        },

        config: {
            id:
                configSnap.id,

            activityId:
                normalizedActivityId,

            ownerTeacherId,

            questions,

            timeLimitSeconds:
                configData.timeLimitSeconds as
                number | undefined,

            shuffleQuestions:
                configData.shuffleQuestions as
                boolean | undefined,

            shuffleOptions:
                configData.shuffleOptions as
                boolean | undefined,

            passingScore:
                configData.passingScore as
                number | undefined,
        },

        answerKey: {
            id:
                answerKeySnap.id,

            activityId:
                normalizedActivityId,

            ownerTeacherId,

            answers:
                answers as Record<
                    string,
                    string | string[]
                >,
        },
    };
}

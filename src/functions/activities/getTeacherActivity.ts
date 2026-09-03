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
    process.env.GCLOUD_PROJECT ?? "eduplay-test";

if (getApps().length === 0) {
    initializeApp({
        projectId,
    });
}

export interface TeacherActivityQuestion {
    id: string;
    type: string;
    text: string;
    options?: Array<{
        id: string;
        text: string;
    }>;
    points?: number;
    explanation?: string;
}

export interface TeacherActivityConfig {
    id: string;
    activityId: string;
    ownerTeacherId: string;
    questions: TeacherActivityQuestion[];
    timeLimitSeconds?: number;
    shuffleQuestions?: boolean;
    shuffleOptions?: boolean;
    passingScore?: number;
    createdAt?: unknown;
    updatedAt?: unknown;
}

export interface TeacherActivityAnswerKey {
    id: string;
    activityId: string;
    ownerTeacherId: string;
    answers: Record<
        string,
        string | string[]
    >;
    createdAt?: unknown;
    updatedAt?: unknown;
}

export interface TeacherActivityDetail {
    id: string;
    title: string;
    description?: string;
    type: string;
    ownerTeacherId: string;
    subjectId?: string;
    topicId?: string;
    configId: string;
    isPublished: boolean;
    createdAt?: unknown;
    updatedAt?: unknown;
}

export interface GetTeacherActivityResult {
    activity: TeacherActivityDetail;
    config: TeacherActivityConfig;
    answerKey: TeacherActivityAnswerKey;
}

export interface GetTeacherActivityAuth {
    uid: string;
}

export async function getTeacherActivityHandler(
    activityId: string,
    auth: GetTeacherActivityAuth | null,
): Promise<GetTeacherActivityResult> {
    if (!auth?.uid) {
        throw new HttpsError(
            "unauthenticated",
            "Debes iniciar sesión.",
        );
    }

    if (
        typeof activityId !== "string" ||
        activityId.trim() === ""
    ) {
        throw new HttpsError(
            "invalid-argument",
            "activityId es obligatorio.",
        );
    }

    const normalizedActivityId =
        activityId.trim();

    const db =
        getFirestore();

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
        typeof ownerTeacherId !==
        "string" ||
        ownerTeacherId.trim() === ""
    ) {
        throw new HttpsError(
            "failed-precondition",
            "La actividad no tiene un docente propietario válido.",
        );
    }

    if (
        ownerTeacherId !== auth.uid
    ) {
        throw new HttpsError(
            "permission-denied",
            "No tienes permiso para consultar esta actividad.",
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
        auth.uid
    ) {
        throw new HttpsError(
            "permission-denied",
            "No tienes permiso para consultar la configuración de esta actividad.",
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
        auth.uid
    ) {
        throw new HttpsError(
            "permission-denied",
            "No tienes permiso para consultar las respuestas de esta actividad.",
        );
    }

    const questions =
        configData.questions;

    if (
        !Array.isArray(questions) ||
        questions.length === 0
    ) {
        throw new HttpsError(
            "failed-precondition",
            "La actividad no tiene preguntas configuradas.",
        );
    }

    const answers =
        answerKeyData.answers;

    if (
        !answers ||
        typeof answers !== "object" ||
        Array.isArray(answers)
    ) {
        throw new HttpsError(
            "failed-precondition",
            "La actividad no tiene respuestas correctas válidas.",
        );
    }

    const normalizedQuestions =
        questions.map(
            (
                question,
                index,
            ) => {
                if (
                    !question ||
                    typeof question !==
                    "object" ||
                    Array.isArray(question)
                ) {
                    throw new HttpsError(
                        "failed-precondition",
                        `La pregunta ${index + 1} de la actividad no es válida.`,
                    );
                }

                const questionData =
                    question as Record<
                        string,
                        unknown
                    >;

                if (
                    typeof questionData.id !==
                    "string" ||
                    questionData.id.trim() === ""
                ) {
                    throw new HttpsError(
                        "failed-precondition",
                        `La pregunta ${index + 1} no tiene un identificador válido.`,
                    );
                }

                if (
                    typeof questionData.type !==
                    "string" ||
                    questionData.type.trim() === ""
                ) {
                    throw new HttpsError(
                        "failed-precondition",
                        `La pregunta ${index + 1} no tiene un tipo válido.`,
                    );
                }

                if (
                    typeof questionData.text !==
                    "string" ||
                    questionData.text.trim() === ""
                ) {
                    throw new HttpsError(
                        "failed-precondition",
                        `La pregunta ${index + 1} no tiene texto válido.`,
                    );
                }

                return {
                    id:
                        questionData.id,

                    type:
                        questionData.type,

                    text:
                        questionData.text,

                    ...(Array.isArray(
                        questionData.options,
                    )
                        ? {
                            options:
                                questionData.options,
                        }
                        : {}),

                    ...(typeof questionData.points ===
                        "number"
                        ? {
                            points:
                                questionData.points,
                        }
                        : {}),

                    ...(typeof questionData.explanation ===
                        "string"
                        ? {
                            explanation:
                                questionData.explanation,
                        }
                        : {}),
                };
            },
        );

    const normalizedAnswers: Record<
        string,
        string | string[]
    > = {};

    for (
        const [questionId, answer] of
        Object.entries(answers)
    ) {
        if (
            typeof answer === "string" ||
            (
                Array.isArray(answer) &&
                answer.every(
                    (item) =>
                        typeof item ===
                        "string",
                )
            )
        ) {
            normalizedAnswers[
                questionId
            ] = answer;
        }
    }

    const activity: TeacherActivityDetail = {
        id:
            activitySnap.id,

        title:
            typeof activityData.title ===
                "string"
                ? activityData.title
                : "Actividad",

        ...(typeof activityData.description ===
            "string"
            ? {
                description:
                    activityData.description,
            }
            : {}),

        type:
            typeof activityData.type ===
                "string"
                ? activityData.type
                : "quiz",

        ownerTeacherId,

        ...(typeof activityData.subjectId ===
            "string"
            ? {
                subjectId:
                    activityData.subjectId,
            }
            : {}),

        ...(typeof activityData.topicId ===
            "string"
            ? {
                topicId:
                    activityData.topicId,
            }
            : {}),

        configId,

        isPublished:
            activityData.isPublished === true,

        ...(activityData.createdAt !==
            undefined
            ? {
                createdAt:
                    activityData.createdAt,
            }
            : {}),

        ...(activityData.updatedAt !==
            undefined
            ? {
                updatedAt:
                    activityData.updatedAt,
            }
            : {}),
    };

    const config: TeacherActivityConfig = {
        id:
            configSnap.id,

        activityId:
            normalizedActivityId,

        ownerTeacherId:
            auth.uid,

        questions:
            normalizedQuestions,

        ...(typeof configData.timeLimitSeconds ===
            "number"
            ? {
                timeLimitSeconds:
                    configData.timeLimitSeconds,
            }
            : {}),

        ...(typeof configData.shuffleQuestions ===
            "boolean"
            ? {
                shuffleQuestions:
                    configData.shuffleQuestions,
            }
            : {}),

        ...(typeof configData.shuffleOptions ===
            "boolean"
            ? {
                shuffleOptions:
                    configData.shuffleOptions,
            }
            : {}),

        ...(typeof configData.passingScore ===
            "number"
            ? {
                passingScore:
                    configData.passingScore,
            }
            : {}),

        ...(configData.createdAt !==
            undefined
            ? {
                createdAt:
                    configData.createdAt,
            }
            : {}),

        ...(configData.updatedAt !==
            undefined
            ? {
                updatedAt:
                    configData.updatedAt,
            }
            : {}),
    };

    const answerKey: TeacherActivityAnswerKey = {
        id:
            answerKeySnap.id,

        activityId:
            normalizedActivityId,

        ownerTeacherId:
            auth.uid,

        answers:
            normalizedAnswers,

        ...(answerKeyData.createdAt !==
            undefined
            ? {
                createdAt:
                    answerKeyData.createdAt,
            }
            : {}),

        ...(answerKeyData.updatedAt !==
            undefined
            ? {
                updatedAt:
                    answerKeyData.updatedAt,
            }
            : {}),
    };

    return {
        activity,
        config,
        answerKey,
    };
}
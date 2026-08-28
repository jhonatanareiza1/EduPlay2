import {
    FieldValue,
} from "firebase-admin/firestore";

import {
    HttpsError,
} from "firebase-functions/v2/https";

import {
    db,
} from "../../config/firebaseAdmin";

const SUBJECTS = [
    "mathematics",
    "english",
    "science",
    "history",
] as const;

const ACTIVITY_TYPES = [
    "quiz",
    "game",
    "video",
    "listening",
    "dialogue",
    "challenge",
] as const;

const QUESTION_TYPES = [
    "multiple-choice",
    "true-false",
    "text",
] as const;

type SubjectId =
    typeof SUBJECTS[number];

type ActivityType =
    typeof ACTIVITY_TYPES[number];

type QuestionType =
    typeof QUESTION_TYPES[number];

interface ActivityQuestionInput {
    id?: string;
    type: QuestionType;
    text: string;
    options?: Array<{
        id: string;
        text: string;
    }>;
    points?: number;
    explanation?: string;
    correctAnswer: string | string[];
}

export interface CreateActivityData {
    title: string;
    description?: string;
    type: ActivityType;
    subjectId: SubjectId;
    topicId?: string;
    questions: ActivityQuestionInput[];
    timeLimitSeconds?: number;
    shuffleQuestions?: boolean;
    shuffleOptions?: boolean;
    passingScore?: number;
    isPublished?: boolean;
}

export interface CreateActivityAuth {
    uid: string;
}

export async function createActivityHandler(
    data: unknown,
    auth: CreateActivityAuth | null,
) {
    if (!auth?.uid) {
        throw new HttpsError(
            "unauthenticated",
            "Debes iniciar sesión.",
        );
    }

    if (
        !data ||
        typeof data !== "object" ||
        Array.isArray(data)
    ) {
        throw new HttpsError(
            "invalid-argument",
            "Los datos de la actividad no son válidos.",
        );
    }

    const input =
        data as Record<string, unknown>;

    const title =
        input.title;

    if (
        typeof title !== "string" ||
        title.trim() === ""
    ) {
        throw new HttpsError(
            "invalid-argument",
            "El título es obligatorio.",
        );
    }

    const type =
        input.type;

    if (
        typeof type !== "string" ||
        !(
            ACTIVITY_TYPES as readonly string[]
        ).includes(type)
    ) {
        throw new HttpsError(
            "invalid-argument",
            "El tipo de actividad no es válido.",
        );
    }

    const subjectId =
        input.subjectId;

    if (
        typeof subjectId !== "string" ||
        !(
            SUBJECTS as readonly string[]
        ).includes(subjectId)
    ) {
        throw new HttpsError(
            "invalid-argument",
            "La materia no es válida.",
        );
    }

    const questions =
        input.questions;

    if (
        !Array.isArray(questions) ||
        questions.length === 0
    ) {
        throw new HttpsError(
            "invalid-argument",
            "La actividad debe tener al menos una pregunta.",
        );
    }

    const normalizedQuestions =
        questions.map(
            (question, index) => {
                if (
                    !question ||
                    typeof question !==
                    "object" ||
                    Array.isArray(question)
                ) {
                    throw new HttpsError(
                        "invalid-argument",
                        `La pregunta ${index + 1} no es válida.`,
                    );
                }

                const item =
                    question as Record<
                        string,
                        unknown
                    >;

                const questionText =
                    item.text;

                if (
                    typeof questionText !==
                    "string" ||
                    questionText.trim() === ""
                ) {
                    throw new HttpsError(
                        "invalid-argument",
                        `La pregunta ${index + 1} no tiene texto.`,
                    );
                }

                const questionType =
                    item.type;

                if (
                    typeof questionType !==
                    "string" ||
                    !(
                        QUESTION_TYPES as readonly string[]
                    ).includes(questionType)
                ) {
                    throw new HttpsError(
                        "invalid-argument",
                        `El tipo de la pregunta ${index + 1} no es válido.`,
                    );
                }

                const correctAnswer =
                    item.correctAnswer;

                if (
                    typeof correctAnswer !==
                    "string" &&
                    !(
                        Array.isArray(
                            correctAnswer,
                        ) &&
                        correctAnswer.every(
                            (answer) =>
                                typeof answer ===
                                "string",
                        )
                    )
                ) {
                    throw new HttpsError(
                        "invalid-argument",
                        `La respuesta correcta de la pregunta ${index + 1} no es válida.`,
                    );
                }

                const options =
                    item.options;

                if (
                    questionType ===
                    "multiple-choice"
                ) {
                    if (
                        !Array.isArray(
                            options,
                        ) ||
                        options.length < 2
                    ) {
                        throw new HttpsError(
                            "invalid-argument",
                            `La pregunta ${index + 1} debe tener al menos dos opciones.`,
                        );
                    }

                    for (
                        const option of options
                    ) {
                        if (
                            !option ||
                            typeof option !==
                            "object" ||
                            Array.isArray(option)
                        ) {
                            throw new HttpsError(
                                "invalid-argument",
                                `Una opción de la pregunta ${index + 1} no es válida.`,
                            );
                        }

                        const optionData =
                            option as Record<
                                string,
                                unknown
                            >;

                        if (
                            typeof optionData.id !==
                            "string" ||
                            optionData.id.trim() ===
                            "" ||
                            typeof optionData.text !==
                            "string" ||
                            optionData.text.trim() ===
                            ""
                        ) {
                            throw new HttpsError(
                                "invalid-argument",
                                `Una opción de la pregunta ${index + 1} no es válida.`,
                            );
                        }
                    }
                }

                const id =
                    typeof item.id ===
                        "string" &&
                        item.id.trim() !== ""
                        ? item.id.trim()
                        : `question-${index + 1}`;

                const points =
                    item.points === undefined
                        ? 1
                        : item.points;

                if (
                    typeof points !==
                    "number" ||
                    !Number.isFinite(points) ||
                    points <= 0
                ) {
                    throw new HttpsError(
                        "invalid-argument",
                        `Los puntos de la pregunta ${index + 1} no son válidos.`,
                    );
                }

                return {
                    publicQuestion: {
                        id,
                        type:
                            questionType as QuestionType,
                        text:
                            questionText.trim(),

                        ...(Array.isArray(options)
                            ? {
                                options:
                                    options.map(
                                        (
                                            option,
                                        ) => {
                                            const optionData =
                                                option as Record<
                                                    string,
                                                    unknown
                                                >;

                                            return {
                                                id:
                                                    optionData.id as string,
                                                text:
                                                    (
                                                        optionData.text as string
                                                    ).trim(),
                                            };
                                        },
                                    ),
                            }
                            : {}),

                        points,

                        ...(typeof item.explanation ===
                            "string"
                            ? {
                                explanation:
                                    item.explanation.trim(),
                            }
                            : {}),
                    },

                    correctAnswer,
                };
            },
        );

    const activityRef =
        db.collection("activities")
            .doc();

    const configRef =
        db.collection("activityConfigs")
            .doc();

    const answerKeyRef =
        db.collection("activityAnswerKeys")
            .doc(activityRef.id);

    const answers: Record<
        string,
        string | string[]
    > = {};

    for (
        const question of normalizedQuestions
    ) {
        answers[
            question.publicQuestion.id
        ] =
            question.correctAnswer;
    }

    const now =
        FieldValue.serverTimestamp();

    const isPublished =
        input.isPublished === true;

    const batch =
        db.batch();

    batch.set(
        activityRef,
        {
            title:
                title.trim(),

            ...(typeof input.description ===
                "string"
                ? {
                    description:
                        input.description.trim(),
                }
                : {}),

            ownerTeacherId:
                auth.uid,

            subjectId,

            ...(typeof input.topicId ===
                "string" &&
                input.topicId.trim() !== ""
                ? {
                    topicId:
                        input.topicId.trim(),
                }
                : {}),

            configId:
                configRef.id,

            type,

            isPublished,

            createdAt:
                now,

            updatedAt:
                now,
        },
    );

    batch.set(
        configRef,
        {
            activityId:
                activityRef.id,

            ownerTeacherId:
                auth.uid,

            questions:
                normalizedQuestions.map(
                    (question) =>
                        question.publicQuestion,
                ),

            ...(typeof input.timeLimitSeconds ===
                "number"
                ? {
                    timeLimitSeconds:
                        input.timeLimitSeconds,
                }
                : {}),

            ...(typeof input.shuffleQuestions ===
                "boolean"
                ? {
                    shuffleQuestions:
                        input.shuffleQuestions,
                }
                : {}),

            ...(typeof input.shuffleOptions ===
                "boolean"
                ? {
                    shuffleOptions:
                        input.shuffleOptions,
                }
                : {}),

            ...(typeof input.passingScore ===
                "number"
                ? {
                    passingScore:
                        input.passingScore,
                }
                : {}),

            createdAt:
                now,

            updatedAt:
                now,
        },
    );

    batch.set(
        answerKeyRef,
        {
            activityId:
                activityRef.id,

            ownerTeacherId:
                auth.uid,

            answers,

            createdAt:
                now,

            updatedAt:
                now,
        },
    );

    await batch.commit();

    return {
        activityId:
            activityRef.id,

        configId:
            configRef.id,

        isPublished,
    };
}
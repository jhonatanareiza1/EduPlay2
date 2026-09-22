import { readFileSync } from "node:fs";

import {
    dirname,
    resolve,
} from "node:path";

import {
    fileURLToPath,
} from "node:url";

import {
    initializeTestEnvironment,
    type RulesTestEnvironment,
} from "@firebase/rules-unit-testing";

import {
    doc,
    getDoc,
} from "firebase/firestore";

import {
    afterAll,
    beforeAll,
    beforeEach,
    describe,
    expect,
    it,
} from "vitest";

import {
    createActivityHandler,
} from "../src/functions/activities/createActivity";

let testEnv: RulesTestEnvironment;

const PROJECT_ID = "eduplay-test";

const FIRESTORE_RULES_PATH =
    resolve(
        dirname(
            fileURLToPath(
                import.meta.url,
            ),
        ),
        "../../firestore.rules",
    );

beforeAll(async () => {
    testEnv =
        await initializeTestEnvironment({
            projectId: PROJECT_ID,
            firestore: {
                host: "127.0.0.1",
                port: 8081,
                rules: readFileSync(
                    FIRESTORE_RULES_PATH,
                    "utf8",
                ),
            },
        });
});

afterAll(async () => {
    if (testEnv) {
        await testEnv.cleanup();
    }
});

beforeEach(async () => {
    await testEnv.clearFirestore();
});

const validActivity = {
    title: "Actividad de Matemáticas",
    description: "Actividad de prueba",
    type: "quiz",
    subjectId: "mathematics",
    topicId: "fractions",
    questions: [
        {
            id: "question-1",
            type: "multiple-choice",
            text: "¿Cuánto es 2 + 2?",
            options: [
                {
                    id: "option-a",
                    text: "3",
                },
                {
                    id: "option-b",
                    text: "4",
                },
            ],
            points: 5,
            explanation: "2 + 2 = 4.",
            correctAnswer: "option-b",
        },
        {
            id: "question-2",
            type: "true-false",
            text: "5 es mayor que 3.",
            points: 5,
            correctAnswer: "true",
        },
    ],
    timeLimitSeconds: 120,
    shuffleQuestions: false,
    shuffleOptions: false,
    passingScore: 6,
    isPublished: true,
};

describe("createActivityHandler", () => {
    it("rechaza una llamada sin autenticación", async () => {
        await expect(
            createActivityHandler(
                validActivity,
                null,
            ),
        ).rejects.toMatchObject({
            code: "unauthenticated",
        });
    });

    it("rechaza un título vacío", async () => {
        await expect(
            createActivityHandler(
                {
                    ...validActivity,
                    title: "",
                },
                {
                    uid: "teacher-test-001",
                },
            ),
        ).rejects.toMatchObject({
            code: "invalid-argument",
        });
    });

    it("rechaza una materia inválida", async () => {
        await expect(
            createActivityHandler(
                {
                    ...validActivity,
                    subjectId: "invalid-subject",
                },
                {
                    uid: "teacher-test-001",
                },
            ),
        ).rejects.toMatchObject({
            code: "invalid-argument",
        });
    });

    it("rechaza un tipo de actividad inválido", async () => {
        await expect(
            createActivityHandler(
                {
                    ...validActivity,
                    type: "invalid-type",
                },
                {
                    uid: "teacher-test-001",
                },
            ),
        ).rejects.toMatchObject({
            code: "invalid-argument",
        });
    });

    it("rechaza una actividad sin preguntas", async () => {
        await expect(
            createActivityHandler(
                {
                    ...validActivity,
                    questions: [],
                },
                {
                    uid: "teacher-test-001",
                },
            ),
        ).rejects.toMatchObject({
            code: "invalid-argument",
        });
    });

    it("rechaza una pregunta sin respuesta correcta", async () => {
        const question =
        {
            ...validActivity.questions[0],
        };

        delete (
            question as {
                correctAnswer?: unknown;
            }
        ).correctAnswer;

        await expect(
            createActivityHandler(
                {
                    ...validActivity,
                    questions: [question],
                },
                {
                    uid: "teacher-test-001",
                },
            ),
        ).rejects.toMatchObject({
            code: "invalid-argument",
        });
    });

    it("rechaza multiple-choice sin suficientes opciones", async () => {
        await expect(
            createActivityHandler(
                {
                    ...validActivity,
                    questions: [
                        {
                            ...validActivity.questions[0],
                            options: [
                                {
                                    id: "option-a",
                                    text: "3",
                                },
                            ],
                        },
                    ],
                },
                {
                    uid: "teacher-test-001",
                },
            ),
        ).rejects.toMatchObject({
            code: "invalid-argument",
        });
    });

    it("crea la actividad, configuración y clave de respuestas", async () => {
        const result =
            await createActivityHandler(
                validActivity,
                {
                    uid: "teacher-test-001",
                },
            );

        expect(result).toMatchObject({
            isPublished: true,
        });

        expect(result.activityId).toBeTruthy();
        expect(result.configId).toBeTruthy();

        let activitySnap;
        let configSnap;
        let answerKeySnap;

        await testEnv
            .withSecurityRulesDisabled(
                async (context) => {
                    const db =
                        context.firestore();

                    activitySnap =
                        await getDoc(
                            doc(
                                db,
                                "activities",
                                result.activityId,
                            ),
                        );

                    configSnap =
                        await getDoc(
                            doc(
                                db,
                                "activityConfigs",
                                result.configId,
                            ),
                        );

                    answerKeySnap =
                        await getDoc(
                            doc(
                                db,
                                "activityAnswerKeys",
                                result.activityId,
                            ),
                        );
                },
            );

        expect(
            activitySnap.exists(),
        ).toBe(true);

        expect(
            configSnap.exists(),
        ).toBe(true);

        expect(
            answerKeySnap.exists(),
        ).toBe(true);

        const activity =
            activitySnap.data();

        const config =
            configSnap.data();

        const answerKey =
            answerKeySnap.data();

        expect(activity).toMatchObject({
            title:
                "Actividad de Matemáticas",
            ownerTeacherId:
                "teacher-test-001",
            subjectId:
                "mathematics",
            topicId:
                "fractions",
            type:
                "quiz",
            configId:
                result.configId,
            isPublished:
                true,
        });

        expect(config).toMatchObject({
            activityId:
                result.activityId,
            ownerTeacherId:
                "teacher-test-001",
            passingScore: 6,
            timeLimitSeconds: 120,
            shuffleQuestions: false,
            shuffleOptions: false,
        });

        expect(
            config?.questions,
        ).toHaveLength(2);

        expect(
            config?.questions?.[0],
        ).not.toHaveProperty(
            "correctAnswer",
        );

        expect(
            config?.questions?.[1],
        ).not.toHaveProperty(
            "correctAnswer",
        );

        expect(answerKey).toMatchObject({
            activityId:
                result.activityId,
            ownerTeacherId:
                "teacher-test-001",
            answers: {
                "question-1":
                    "option-b",
                "question-2":
                    "true",
            },
        });
    });
});
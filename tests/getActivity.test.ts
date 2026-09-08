import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import {
    initializeTestEnvironment,
    type RulesTestEnvironment,
} from "@firebase/rules-unit-testing";

import {
    doc,
    setDoc,
} from "firebase/firestore";

import {
    beforeAll,
    afterAll,
    beforeEach,
    describe,
    expect,
    it,
} from "vitest";

import {
    getActivityForAttempt,
} from "../src/functions/activities/getActivity";

let testEnv: RulesTestEnvironment;

const PROJECT_ID =
    "eduplay-test";

beforeAll(async () => {
    testEnv =
        await initializeTestEnvironment({
            projectId: PROJECT_ID,

            firestore: {
                host: "127.0.0.1",
                port: 8081,

                rules: readFileSync(
                    resolve(
                        process.cwd(),
                        "../firestore.rules",
                    ),
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

async function seedValidActivity(
    activityId = "activity-test-001",
    configId = "config-test-001",
) {
    await testEnv
        .withSecurityRulesDisabled(
            async (context) => {
                const db =
                    context.firestore();

                await setDoc(
                    doc(
                        db,
                        "activities",
                        activityId,
                    ),
                    {
                        title:
                            "Actividad de prueba",
                        description:
                            "Descripción de prueba",
                        ownerTeacherId:
                            "teacher-test-001",
                        configId,
                        type: "quiz",
                        isPublished: true,
                    },
                );

                await setDoc(
                    doc(
                        db,
                        "activityConfigs",
                        configId,
                    ),
                    {
                        activityId,
                        ownerTeacherId:
                            "teacher-test-001",

                        questions: [
                            {
                                id: "question1",
                                type:
                                    "multiple-choice",
                                text:
                                    "Pregunta 1",
                                options: [
                                    {
                                        id:
                                            "option-a",
                                        text:
                                            "Correcta",
                                    },
                                    {
                                        id:
                                            "option-b",
                                        text:
                                            "Incorrecta",
                                    },
                                ],
                                points: 5,
                            },
                            {
                                id: "question2",
                                type:
                                    "multiple-choice",
                                text:
                                    "Pregunta 2",
                                options: [
                                    {
                                        id:
                                            "option-a",
                                        text:
                                            "Incorrecta",
                                    },
                                    {
                                        id:
                                            "option-b",
                                        text:
                                            "Correcta",
                                    },
                                ],
                                points: 5,
                            },
                        ],

                        passingScore: 6,
                    },
                );

                await setDoc(
                    doc(
                        db,
                        "activityAnswerKeys",
                        activityId,
                    ),
                    {
                        activityId,
                        ownerTeacherId:
                            "teacher-test-001",

                        answers: {
                            question1:
                                "option-a",
                            question2:
                                "option-b",
                        },
                    },
                );
            },
        );
}

describe("getActivityForAttempt", () => {
    it("carga correctamente una actividad completa", async () => {
        await seedValidActivity();

        const result =
            await getActivityForAttempt(
                "activity-test-001",
            );

        expect(result.activity).toMatchObject({
            id: "activity-test-001",
            title: "Actividad de prueba",
            ownerTeacherId:
                "teacher-test-001",
            configId: "config-test-001",
            type: "quiz",
            isPublished: true,
        });

        expect(result.config).toMatchObject({
            id: "config-test-001",
            activityId:
                "activity-test-001",
            ownerTeacherId:
                "teacher-test-001",
            passingScore: 6,
        });

        expect(
            result.config.questions,
        ).toHaveLength(2);

        expect(result.answerKey).toEqual({
            id: "activity-test-001",
            activityId:
                "activity-test-001",
            ownerTeacherId:
                "teacher-test-001",
            answers: {
                question1:
                    "option-a",
                question2:
                    "option-b",
            },
        });
    });

    it("rechaza activityId vacío", async () => {
        await expect(
            getActivityForAttempt(""),
        ).rejects.toMatchObject({
            code: "invalid-argument",
        });
    });

    it("rechaza una actividad inexistente", async () => {
        await expect(
            getActivityForAttempt(
                "activity-inexistente",
            ),
        ).rejects.toMatchObject({
            code: "not-found",
        });
    });

    it("rechaza una actividad sin configuración", async () => {
        await testEnv
            .withSecurityRulesDisabled(
                async (context) => {
                    await setDoc(
                        doc(
                            context.firestore(),
                            "activities",
                            "activity-test-002",
                        ),
                        {
                            title:
                                "Actividad inválida",
                            ownerTeacherId:
                                "teacher-test-001",
                            configId:
                                "config-inexistente",
                            isPublished: true,
                        },
                    );
                },
            );

        await expect(
            getActivityForAttempt(
                "activity-test-002",
            ),
        ).rejects.toMatchObject({
            code: "not-found",
        });
    });

    it("rechaza una actividad sin answer key", async () => {
        await testEnv
            .withSecurityRulesDisabled(
                async (context) => {
                    const db =
                        context.firestore();

                    await setDoc(
                        doc(
                            db,
                            "activities",
                            "activity-test-003",
                        ),
                        {
                            title:
                                "Actividad sin respuestas",
                            ownerTeacherId:
                                "teacher-test-001",
                            configId:
                                "config-test-003",
                        },
                    );

                    await setDoc(
                        doc(
                            db,
                            "activityConfigs",
                            "config-test-003",
                        ),
                        {
                            activityId:
                                "activity-test-003",
                            ownerTeacherId:
                                "teacher-test-001",
                            questions: [
                                {
                                    id: "question1",
                                    type:
                                        "multiple-choice",
                                    text:
                                        "Pregunta",
                                },
                            ],
                        },
                    );
                },
            );

        await expect(
            getActivityForAttempt(
                "activity-test-003",
            ),
        ).rejects.toMatchObject({
            code: "failed-precondition",
        });
    });

    it("rechaza una configuración de otra actividad", async () => {
        await testEnv
            .withSecurityRulesDisabled(
                async (context) => {
                    const db =
                        context.firestore();

                    await setDoc(
                        doc(
                            db,
                            "activities",
                            "activity-test-004",
                        ),
                        {
                            title:
                                "Actividad",
                            ownerTeacherId:
                                "teacher-test-001",
                            configId:
                                "config-test-004",
                        },
                    );

                    await setDoc(
                        doc(
                            db,
                            "activityConfigs",
                            "config-test-004",
                        ),
                        {
                            activityId:
                                "otra-actividad",
                            ownerTeacherId:
                                "teacher-test-001",
                            questions: [
                                {
                                    id: "question1",
                                    type:
                                        "multiple-choice",
                                    text:
                                        "Pregunta",
                                },
                            ],
                        },
                    );

                    await setDoc(
                        doc(
                            db,
                            "activityAnswerKeys",
                            "activity-test-004",
                        ),
                        {
                            activityId:
                                "activity-test-004",
                            ownerTeacherId:
                                "teacher-test-001",
                            answers: {
                                question1:
                                    "option-a",
                            },
                        },
                    );
                },
            );

        await expect(
            getActivityForAttempt(
                "activity-test-004",
            ),
        ).rejects.toMatchObject({
            code: "failed-precondition",
        });
    });

    it("rechaza una configuración de otro docente", async () => {
        await testEnv
            .withSecurityRulesDisabled(
                async (context) => {
                    const db =
                        context.firestore();

                    await setDoc(
                        doc(
                            db,
                            "activities",
                            "activity-test-005",
                        ),
                        {
                            title:
                                "Actividad",
                            ownerTeacherId:
                                "teacher-test-001",
                            configId:
                                "config-test-005",
                        },
                    );

                    await setDoc(
                        doc(
                            db,
                            "activityConfigs",
                            "config-test-005",
                        ),
                        {
                            activityId:
                                "activity-test-005",
                            ownerTeacherId:
                                "teacher-otro",
                            questions: [
                                {
                                    id: "question1",
                                    type:
                                        "multiple-choice",
                                    text:
                                        "Pregunta",
                                },
                            ],
                        },
                    );

                    await setDoc(
                        doc(
                            db,
                            "activityAnswerKeys",
                            "activity-test-005",
                        ),
                        {
                            activityId:
                                "activity-test-005",
                            ownerTeacherId:
                                "teacher-test-001",
                            answers: {
                                question1:
                                    "option-a",
                            },
                        },
                    );
                },
            );

        await expect(
            getActivityForAttempt(
                "activity-test-005",
            ),
        ).rejects.toMatchObject({
            code: "failed-precondition",
        });
    });

    it("rechaza una actividad sin preguntas", async () => {
        await testEnv
            .withSecurityRulesDisabled(
                async (context) => {
                    const db =
                        context.firestore();

                    await setDoc(
                        doc(
                            db,
                            "activities",
                            "activity-test-006",
                        ),
                        {
                            title:
                                "Actividad sin preguntas",
                            ownerTeacherId:
                                "teacher-test-001",
                            configId:
                                "config-test-006",
                        },
                    );

                    await setDoc(
                        doc(
                            db,
                            "activityConfigs",
                            "config-test-006",
                        ),
                        {
                            activityId:
                                "activity-test-006",
                            ownerTeacherId:
                                "teacher-test-001",
                            questions: [],
                        },
                    );

                    await setDoc(
                        doc(
                            db,
                            "activityAnswerKeys",
                            "activity-test-006",
                        ),
                        {
                            activityId:
                                "activity-test-006",
                            ownerTeacherId:
                                "teacher-test-001",
                            answers: {
                                question1:
                                    "option-a",
                            },
                        },
                    );
                },
            );

        await expect(
            getActivityForAttempt(
                "activity-test-006",
            ),
        ).rejects.toMatchObject({
            code: "failed-precondition",
        });
    });
});
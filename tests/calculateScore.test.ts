import {
    describe,
    expect,
    it,
} from "vitest";

import {
    calculateScoreHandler,
} from "../src/functions/attempts/calculateScore";

describe("calculateScore", () => {
    it(
        "calcula correctamente una puntuación usando la clave privada",
        () => {
            const result =
                calculateScoreHandler({
                    activityId:
                        "activity-test-001",

                    answers: {
                        q1: "option-a",
                        q2: "option-b",
                        q3: "option-a",
                        q4: "option-c",
                    },

                    answerKey: {
                        q1: "option-a",
                        q2: "option-b",
                        q3: "option-b",
                        q4: "option-c",
                    },
                });

            /*
             * Cada pregunta vale 1 punto.
             *
             * Correctas:
             * q1
             * q2
             * q4
             *
             * Total obtenido: 3
             * Total posible: 4
             */
            expect(result.score).toBe(3);

            expect(result.totalPoints)
                .toBe(4);

            expect(result.correctAnswers)
                .toBe(3);

            expect(result.totalQuestions)
                .toBe(4);

            expect(result.passed)
                .toBe(false);
        },
    );

    it(
        "devuelve cero cuando no hay respuestas",
        () => {
            const result =
                calculateScoreHandler({
                    activityId:
                        "activity-test-001",

                    answers: {},

                    answerKey: {
                        q1: "option-a",
                        q2: "option-b",
                    },
                });

            expect(result.score)
                .toBe(0);

            expect(result.totalPoints)
                .toBe(2);

            expect(result.correctAnswers)
                .toBe(0);

            expect(result.totalQuestions)
                .toBe(2);

            expect(result.passed)
                .toBe(false);
        },
    );

    it(
        "rechaza activityId vacío",
        () => {
            expect(() =>
                calculateScoreHandler({
                    activityId: "",
                    answers: {},
                    answerKey: {},
                }),
            ).toThrow();
        },
    );

    it(
        "rechaza respuestas inválidas",
        () => {
            expect(() =>
                calculateScoreHandler({
                    activityId:
                        "activity-test-001",

                    answers:
                        null as unknown as Record<
                            string,
                            unknown
                        >,

                    answerKey: {},
                }),
            ).toThrow();
        },
    );

    it(
        "no permite que isCorrect manipule la puntuación",
        () => {
            const result =
                calculateScoreHandler({
                    activityId:
                        "activity-test-001",

                    answers: {
                        q1: {
                            isCorrect: true,
                        },
                    },

                    answerKey: {
                        q1: "option-b",
                    },
                });

            expect(result.correctAnswers)
                .toBe(0);

            expect(result.score)
                .toBe(0);

            expect(result.totalPoints)
                .toBe(1);
        },
    );

    it(
        "acepta respuestas múltiples sin importar el orden",
        () => {
            const result =
                calculateScoreHandler({
                    activityId:
                        "activity-test-001",

                    answers: {
                        q1: [
                            "option-b",
                            "option-a",
                        ],
                    },

                    answerKey: {
                        q1: [
                            "option-a",
                            "option-b",
                        ],
                    },
                });

            expect(result.correctAnswers)
                .toBe(1);

            expect(result.score)
                .toBe(1);

            expect(result.totalPoints)
                .toBe(1);

            expect(result.totalQuestions)
                .toBe(1);

            expect(result.passed)
                .toBe(false);
        },
    );

    it(
        "calcula correctamente preguntas con diferentes valores de puntos",
        () => {
            const result =
                calculateScoreHandler({
                    activityId:
                        "activity-test-points",

                    answers: {
                        q1: "option-a",
                        q2: "option-b",
                        q3: "option-a",
                    },

                    answerKey: {
                        q1: "option-a",
                        q2: "option-a",
                        q3: "option-a",
                    },

                    pointsByQuestion: {
                        q1: 5,
                        q2: 10,
                        q3: 20,
                    },
                });

            /*
             * q1 = correcta = 5 puntos
             * q2 = incorrecta = 0 puntos
             * q3 = correcta = 20 puntos
             *
             * Total obtenido = 25
             * Total posible = 35
             */
            expect(result.score)
                .toBe(25);

            expect(result.totalPoints)
                .toBe(35);

            expect(result.correctAnswers)
                .toBe(2);

            expect(result.totalQuestions)
                .toBe(3);
        },
    );

    it(
        "determina aprobado usando passingScore en puntos reales",
        () => {
            const result =
                calculateScoreHandler({
                    activityId:
                        "activity-test-passing",

                    answers: {
                        q1: "option-a",
                        q2: "option-b",
                    },

                    answerKey: {
                        q1: "option-a",
                        q2: "option-b",
                    },

                    pointsByQuestion: {
                        q1: 5,
                        q2: 5,
                    },

                    passingScore: 6,
                });

            expect(result.score)
                .toBe(10);

            expect(result.totalPoints)
                .toBe(10);

            expect(result.passed)
                .toBe(true);
        },
    );

    it(
        "rechaza cuando una respuesta múltiple contiene valores no válidos",
        () => {
            const result =
                calculateScoreHandler({
                    activityId:
                        "activity-test-invalid-multiple",

                    answers: {
                        q1: [
                            "option-a",
                            123,
                        ] as unknown as string[],
                    },

                    answerKey: {
                        q1: [
                            "option-a",
                            "option-b",
                        ],
                    },
                });

            expect(result.correctAnswers)
                .toBe(0);

            expect(result.score)
                .toBe(0);

            expect(result.totalPoints)
                .toBe(1);
        },
    );
});
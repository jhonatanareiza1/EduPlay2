import { HttpsError } from "firebase-functions/v2/https";

export interface CalculateScoreData {
    activityId: string;
    answers: Record<string, unknown>;
    answerKey: Record<string, string | string[]>;
    pointsByQuestion?: Record<string, number>;
    passingScore?: number;
}

export interface CalculateScoreResult {
    score: number;
    totalPoints: number;
    correctAnswers: number;
    totalQuestions: number;
    passed: boolean;
    answers: Array<{
        questionId: string;
        answer: string | string[];
        isCorrect: boolean;
        pointsEarned: number;
        pointsAvailable: number;
    }>;
}

function normalizeAnswer(
    answer: string | string[],
): string[] {
    const values = Array.isArray(answer)
        ? answer
        : [answer];

    return values
        .map((value) => value.trim().toLowerCase())
        .sort();
}

function answersMatch(
    submitted: string | string[],
    correct: string | string[],
): boolean {
    const submittedValues =
        normalizeAnswer(submitted);

    const correctValues =
        normalizeAnswer(correct);

    if (
        submittedValues.length !==
        correctValues.length
    ) {
        return false;
    }

    return submittedValues.every(
        (value, index) =>
            value === correctValues[index],
    );
}

export function calculateScoreHandler(
    data: CalculateScoreData,
): CalculateScoreResult {
    if (
        !data ||
        typeof data.activityId !== "string" ||
        data.activityId.trim() === ""
    ) {
        throw new HttpsError(
            "invalid-argument",
            "activityId es obligatorio.",
        );
    }

    if (
        !data.answers ||
        typeof data.answers !== "object" ||
        Array.isArray(data.answers)
    ) {
        throw new HttpsError(
            "invalid-argument",
            "Las respuestas son inválidas.",
        );
    }

    if (
        !data.answerKey ||
        typeof data.answerKey !== "object" ||
        Array.isArray(data.answerKey)
    ) {
        throw new HttpsError(
            "invalid-argument",
            "La clave de respuestas es inválida.",
        );
    }

    const questionIds =
        Object.keys(data.answerKey);

    const totalQuestions =
        questionIds.length;

    if (totalQuestions === 0) {
        return {
            score: 0,
            totalPoints: 0,
            correctAnswers: 0,
            totalQuestions: 0,
            passed: false,
            answers: [],
        };
    }

    let totalPoints = 0;
    let earnedPoints = 0;
    let correctAnswers = 0;

    const results =
        questionIds.map((questionId) => {
            const pointsAvailable =
                data.pointsByQuestion?.[questionId]
                ?? 1;

            totalPoints += pointsAvailable;

            const submitted =
                data.answers[questionId];

            const correct =
                data.answerKey[questionId];

            const validSubmitted =
                typeof submitted === "string"
                || (
                    Array.isArray(submitted)
                    && submitted.every(
                        (value) =>
                            typeof value === "string",
                    )
                );

            const isCorrect =
                validSubmitted
                && (
                    answersMatch(
                        submitted as string | string[],
                        correct,
                    )
                );

            const pointsEarned =
                isCorrect
                    ? pointsAvailable
                    : 0;

            if (isCorrect) {
                correctAnswers += 1;
                earnedPoints += pointsEarned;
            }

            return {
                questionId,
                answer: validSubmitted
                    ? submitted as string | string[]
                    : "",
                isCorrect,
                pointsEarned,
                pointsAvailable,
            };
        });

    const score =
        totalPoints === 0
            ? 0
            : Math.round(
                (earnedPoints / totalPoints) * 10,
            );

    const passingScore =
        typeof data.passingScore === "number"
            ? data.passingScore
            : 6;

    return {
        score,
        totalPoints,
        correctAnswers,
        totalQuestions,
        passed: score >= passingScore,
        answers: results,
    };
}
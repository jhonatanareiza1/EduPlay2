import { HttpsError } from "firebase-functions/v2/https";

export interface CalculateScoreData {
    activityId: string;
    answers: Record<string, unknown>;
}

export interface CalculateScoreResult {
    score: number;
    correctAnswers: number;
    totalAnswers: number;
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

    const answers = Object.values(data.answers);

    if (answers.length === 0) {
        return {
            score: 0,
            correctAnswers: 0,
            totalAnswers: 0,
        };
    }

    const correctAnswers = answers.filter(
        (answer) =>
            typeof answer === "object" &&
            answer !== null &&
            "isCorrect" in answer &&
            answer.isCorrect === true,
    ).length;

    const totalAnswers = answers.length;

    const score = Math.round(
        (correctAnswers / totalAnswers) * 10,
    );

    return {
        score,
        correctAnswers,
        totalAnswers,
    };
}
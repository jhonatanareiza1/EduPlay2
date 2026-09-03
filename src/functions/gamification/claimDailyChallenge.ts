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
    process.env.GCLOUD_PROJECT
    ?? "eduplay-test";

if (getApps().length === 0) {
    initializeApp({
        projectId,
    });
}

interface ClaimDailyChallengeData {
    challengeId: string;
}

interface ClaimDailyChallengeAuth {
    uid: string;
}

export interface ClaimDailyChallengeResult {
    challengeId: string;
    date: string;
    completed: boolean;
    rewarded: boolean;
    xp: number;
    totalXP: number;
    level: number;
}

interface ChallengeDefinition {
    xp: number;
    type:
    | "correct_answers"
    | "distinct_activities"
    | "play_time";
    target: number;
}

const CHALLENGES: Record<
    string,
    ChallengeDefinition
> = {
    correctAnswers20: {
        xp: 25,
        type: "correct_answers",
        target: 20,
    },

    play15Minutes: {
        xp: 20,
        type: "play_time",
        target: 15,
    },

    complete3Activities: {
        xp: 30,
        type: "distinct_activities",
        target: 3,
    },
};

function getBogotaDateKey(): string {
    return new Intl.DateTimeFormat(
        "en-CA",
        {
            timeZone: "America/Bogota",
            year: "numeric",
            month: "2-digit",
            day: "2-digit",
        },
    ).format(new Date());
}

function getAttemptDate(
    value: unknown,
): Date | null {
    if (!value) {
        return null;
    }

    if (
        typeof value === "object" &&
        value !== null &&
        "toDate" in value &&
        typeof value.toDate === "function"
    ) {
        const date = value.toDate();

        return date instanceof Date &&
            !Number.isNaN(date.getTime())
            ? date
            : null;
    }

    if (
        typeof value === "object" &&
        value !== null &&
        "seconds" in value &&
        typeof value.seconds === "number"
    ) {
        const date = new Date(
            value.seconds * 1000,
        );

        return !Number.isNaN(date.getTime())
            ? date
            : null;
    }

    if (
        typeof value === "string" ||
        typeof value === "number"
    ) {
        const date = new Date(value);

        return !Number.isNaN(date.getTime())
            ? date
            : null;
    }

    return null;
}

function isTodayInBogota(
    date: Date | null,
): boolean {
    if (!date) {
        return false;
    }

    const formatter = new Intl.DateTimeFormat(
        "en-CA",
        {
            timeZone: "America/Bogota",
            year: "numeric",
            month: "2-digit",
            day: "2-digit",
        },
    );

    return (
        formatter.format(date) ===
        formatter.format(new Date())
    );
}

export async function claimDailyChallengeHandler(
    data: ClaimDailyChallengeData,
    auth: ClaimDailyChallengeAuth | null,
): Promise<ClaimDailyChallengeResult> {
    if (!auth) {
        throw new HttpsError(
            "unauthenticated",
            "Debes iniciar sesión.",
        );
    }

    if (
        !data ||
        typeof data.challengeId !== "string" ||
        data.challengeId.trim() === ""
    ) {
        throw new HttpsError(
            "invalid-argument",
            "challengeId es obligatorio.",
        );
    }

    const challengeId =
        data.challengeId.trim();

    const challenge =
        CHALLENGES[challengeId];

    if (!challenge) {
        throw new HttpsError(
            "invalid-argument",
            "El reto diario no existe.",
        );
    }

    if (challenge.type === "play_time") {
        throw new HttpsError(
            "failed-precondition",
            "Este reto todavía no tiene seguimiento de tiempo disponible.",
        );
    }

    const database = getFirestore();

    const dateKey =
        getBogotaDateKey();

    const completionId =
        `${auth.uid}_${dateKey}_${challengeId}`;

    const completionReference =
        database
            .collection("dailyChallengeCompletions")
            .doc(completionId);

    const profileReference =
        database
            .collection("gamificationProfiles")
            .doc(auth.uid);

    const attemptsQuery =
        database
            .collection("attempts")
            .where(
                "studentId",
                "==",
                auth.uid,
            );

    const attemptsSnapshot =
        await attemptsQuery.get();

    let dailyCorrectAnswers = 0;

    const dailyActivities =
        new Set<string>();

    for (
        const attemptSnapshot
        of attemptsSnapshot.docs
    ) {
        const attempt =
            attemptSnapshot.data();

        const attemptDate =
            getAttemptDate(
                attempt.createdAt,
            );

        if (
            !isTodayInBogota(
                attemptDate,
            )
        ) {
            continue;
        }

        if (
            typeof attempt.correctAnswers ===
            "number"
        ) {
            dailyCorrectAnswers +=
                Math.max(
                    attempt.correctAnswers,
                    0,
                );
        }

        if (
            typeof attempt.activityId ===
            "string" &&
            attempt.activityId.trim() !== ""
        ) {
            dailyActivities.add(
                attempt.activityId,
            );
        }
    }

    let requirementCompleted = false;

    if (
        challenge.type ===
        "correct_answers"
    ) {
        requirementCompleted =
            dailyCorrectAnswers >=
            challenge.target;
    }

    if (
        challenge.type ===
        "distinct_activities"
    ) {
        requirementCompleted =
            dailyActivities.size >=
            challenge.target;
    }

    if (!requirementCompleted) {
        throw new HttpsError(
            "failed-precondition",
            "Todavía no has completado este reto diario.",
        );
    }

    const result =
        await database.runTransaction(
            async (transaction) => {
                const [
                    completionSnapshot,
                    profileSnapshot,
                ] = await Promise.all([
                    transaction.get(
                        completionReference,
                    ),
                    transaction.get(
                        profileReference,
                    ),
                ]);

                if (
                    !profileSnapshot.exists
                ) {
                    throw new HttpsError(
                        "not-found",
                        "El perfil de gamificación no existe.",
                    );
                }

                const profileData =
                    profileSnapshot.data() ?? {};

                const currentXP =
                    typeof profileData.totalXP ===
                        "number"
                        ? profileData.totalXP
                        : 0;

                const currentLevel =
                    typeof profileData.level ===
                        "number"
                        ? profileData.level
                        : 1;

                if (
                    completionSnapshot.exists
                ) {
                    return {
                        rewarded: false,
                        xp: 0,
                        totalXP: currentXP,
                        level: currentLevel,
                    };
                }

                const newTotalXP =
                    currentXP +
                    challenge.xp;

                const newLevel =
                    Math.floor(
                        newTotalXP / 100,
                    ) + 1;

                const now =
                    new Date();

                transaction.create(
                    completionReference,
                    {
                        studentId:
                            auth.uid,
                        challengeId,
                        date: dateKey,
                        xp: challenge.xp,
                        completedAt: now,
                        rewarded: true,
                    },
                );

                transaction.update(
                    profileReference,
                    {
                        totalXP:
                            newTotalXP,
                        level:
                            newLevel,
                        updatedAt: now,
                    },
                );

                return {
                    rewarded: true,
                    xp: challenge.xp,
                    totalXP:
                        newTotalXP,
                    level:
                        newLevel,
                };
            },
        );

    return {
        challengeId,
        date: dateKey,
        completed: true,
        rewarded:
            result.rewarded,
        xp:
            result.xp,
        totalXP:
            result.totalXP,
        level:
            result.level,
    };
}
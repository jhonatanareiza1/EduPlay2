import {
    unlockAchievementHandler,
} from "./unlockAchievement";

export interface EvaluateAchievementsData {
    studentId: string;
    passed: boolean;
    scorePercentage: number;
    activitiesCompleted: number;
    totalXP: number;
}

export interface EvaluateAchievementsAuth {
    uid: string;
}

export async function evaluateAchievementsHandler(
    data: EvaluateAchievementsData,
    auth: EvaluateAchievementsAuth | null,
): Promise<void> {
    if (!auth) {
        return;
    }

    if (auth.uid !== data.studentId) {
        return;
    }

    const achievements: string[] = [];

    if (data.passed) {
        achievements.push("first-victory");
    }

    if (data.scorePercentage >= 100) {
        achievements.push("perfect-score");
    }

    if (data.activitiesCompleted >= 5) {
        achievements.push("five-activities");
    }

    if (data.totalXP >= 100) {
        achievements.push("hundred-xp");
    }

    for (const achievementId of achievements) {
        await unlockAchievementHandler(
            {
                studentId: data.studentId,
                achievementId,
            },
            auth,
        );
    }
}

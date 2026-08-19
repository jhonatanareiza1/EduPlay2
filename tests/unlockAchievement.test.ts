import { describe, expect, it } from "vitest";

import {
    unlockAchievementHandler,
} from "../src/functions/gamification/unlockAchievement";

describe("unlockAchievement", () => {
    it("permite desbloquear un logro", () => {
        const result = unlockAchievementHandler({
            studentId: "student-test-001",
            achievementId: "achievement-test-001",
        });

        expect(result).toEqual({
            studentId: "student-test-001",
            achievementId: "achievement-test-001",
            unlocked: true,
        });
    });

    it("rechaza studentId vacío", () => {
        expect(() =>
            unlockAchievementHandler({
                studentId: "",
                achievementId: "achievement-test-001",
            }),
        ).toThrow();
    });

    it("rechaza achievementId vacío", () => {
        expect(() =>
            unlockAchievementHandler({
                studentId: "student-test-001",
                achievementId: "",
            }),
        ).toThrow();
    });

    it("rechaza ambos identificadores vacíos", () => {
        expect(() =>
            unlockAchievementHandler({
                studentId: "",
                achievementId: "",
            }),
        ).toThrow();
    });
});
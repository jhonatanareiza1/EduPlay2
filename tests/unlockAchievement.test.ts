import {
    beforeEach,
    describe,
    expect,
    it,
} from "vitest";

import {
    getApps,
    initializeApp,
} from "firebase-admin/app";

import {
    getFirestore,
} from "firebase-admin/firestore";

import {
    unlockAchievementHandler,
} from "../src/functions/gamification/unlockAchievement";

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

const database = getFirestore();

const studentId =
    "student-test-001";

describe("unlockAchievement", () => {
    beforeEach(async () => {
        await database
            .collection("gamificationProfiles")
            .doc(studentId)
            .set({
                studentId,

                totalXP: 0,
                level: 1,
                coins: 0,

                currentStreak: 0,
                bestStreak: 0,

                subjects: {
                    mathematics: {
                        percentage: 0,
                        level: 1,
                        label: "Básico",
                    },
                    english: {
                        percentage: 0,
                        level: 1,
                        label: "Básico",
                    },
                    science: {
                        percentage: 0,
                        level: 1,
                        label: "Básico",
                    },
                    history: {
                        percentage: 0,
                        level: 1,
                        label: "Básico",
                    },
                },

                lastActivityAt: null,
                createdAt: new Date(),
                updatedAt: new Date(),
            });
    });

    it("permite desbloquear un logro", async () => {
        const result =
            await unlockAchievementHandler({
                studentId,
                achievementId:
                    "achievement-test-001",
            });

        expect(result).toEqual({
            studentId,
            achievementId:
                "achievement-test-001",
            unlocked: true,
        });
    });

    it("permite desbloquear el mismo logro sin duplicarlo", async () => {
        const first =
            await unlockAchievementHandler({
                studentId,
                achievementId:
                    "achievement-test-002",
            });

        const second =
            await unlockAchievementHandler({
                studentId,
                achievementId:
                    "achievement-test-002",
            });

        expect(first).toEqual({
            studentId,
            achievementId:
                "achievement-test-002",
            unlocked: true,
        });

        expect(second).toEqual({
            studentId,
            achievementId:
                "achievement-test-002",
            unlocked: true,
        });
    });

    it("rechaza studentId vacío", async () => {
        await expect(
            unlockAchievementHandler({
                studentId: "",
                achievementId:
                    "achievement-test-001",
            }),
        ).rejects.toThrow();
    });

    it("rechaza achievementId vacío", async () => {
        await expect(
            unlockAchievementHandler({
                studentId,
                achievementId: "",
            }),
        ).rejects.toThrow();
    });

    it("rechaza ambos identificadores vacíos", async () => {
        await expect(
            unlockAchievementHandler({
                studentId: "",
                achievementId: "",
            }),
        ).rejects.toThrow();
    });

    it("rechaza un perfil de gamificación inexistente", async () => {
        await expect(
            unlockAchievementHandler({
                studentId:
                    "student-inexistente-001",
                achievementId:
                    "achievement-test-003",
            }),
        ).rejects.toThrow();
    });
});
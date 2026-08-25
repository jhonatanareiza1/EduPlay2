import {
    beforeAll,
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
    awardCoinsHandler,
} from "../src/functions/gamification/awardCoins";

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
    "student-coins-test-001";

const profileReference = database
    .collection("gamificationProfiles")
    .doc(studentId);

describe("awardCoins", () => {
    beforeAll(async () => {
        await database
            .collection("students")
            .doc(studentId)
            .set({
                name: "Estudiante de prueba",
            });
    });

    beforeEach(async () => {
        await profileReference.set({
            studentId,

            totalXP: 0,
            level: 1,
            coins: 0,

            currentStreak: 0,
            bestStreak: 0,

            subjects: {},

            lastActivityAt: null,

            createdAt: new Date(),
            updatedAt: new Date(),
        });
    });

    it("permite otorgar EduCoins válidas", async () => {
        const result =
            await awardCoinsHandler({
                studentId,
                amount: 25,
                reason: "Actividad completada",
            });

        expect(result.studentId).toBe(
            studentId,
        );

        expect(result.amount).toBe(25);

        expect(result.reason).toBe(
            "Actividad completada",
        );

        expect(result.coins).toBeGreaterThanOrEqual(
            25,
        );

        const profileSnapshot =
            await profileReference.get();

        expect(
            profileSnapshot.exists,
        ).toBe(true);

        expect(
            profileSnapshot.data()?.coins,
        ).toBeGreaterThanOrEqual(25);
    });

    it("rechaza studentId vacío", async () => {
        await expect(
            awardCoinsHandler({
                studentId: "",
                amount: 25,
                reason: "Actividad completada",
            }),
        ).rejects.toThrow();
    });

    it("rechaza cantidad cero o negativa", async () => {
        await expect(
            awardCoinsHandler({
                studentId,
                amount: 0,
                reason: "Actividad completada",
            }),
        ).rejects.toThrow();

        await expect(
            awardCoinsHandler({
                studentId,
                amount: -10,
                reason: "Actividad completada",
            }),
        ).rejects.toThrow();
    });

    it("rechaza reason vacío", async () => {
        await expect(
            awardCoinsHandler({
                studentId,
                amount: 25,
                reason: "",
            }),
        ).rejects.toThrow();
    });

    it("rechaza un perfil de gamificación inexistente", async () => {
        await expect(
            awardCoinsHandler({
                studentId:
                    "student-coins-without-profile",
                amount: 25,
                reason: "Actividad completada",
            }),
        ).rejects.toThrow();
    });
});
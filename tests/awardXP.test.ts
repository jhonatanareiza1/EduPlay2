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
    awardXPHandler,
} from "../src/functions/gamification/awardXP";

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

const profileReference = database
    .collection("gamificationProfiles")
    .doc(studentId);

describe("awardXP", () => {
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

    it("permite otorgar XP válida", async () => {
        const result =
            await awardXPHandler({
                studentId,
                amount: 50,
                reason: "Actividad completada",
            });

        expect(result).toEqual({
            studentId,
            amount: 50,
            reason: "Actividad completada",
            totalXP: 50,
            level: 1,
        });

        const profileSnapshot =
            await profileReference.get();

        expect(
            profileSnapshot.data()?.totalXP,
        ).toBe(50);

        expect(
            profileSnapshot.data()?.level,
        ).toBe(1);
    });

    it("sube de nivel al alcanzar 100 XP", async () => {
        await profileReference.update({
            totalXP: 75,
            level: 1,
        });

        const result =
            await awardXPHandler({
                studentId,
                amount: 25,
                reason: "Actividad completada",
            });

        expect(result.totalXP).toBe(100);
        expect(result.level).toBe(2);

        const profileSnapshot =
            await profileReference.get();

        expect(
            profileSnapshot.data()?.totalXP,
        ).toBe(100);

        expect(
            profileSnapshot.data()?.level,
        ).toBe(2);
    });

    it("rechaza studentId vacío", async () => {
        await expect(
            awardXPHandler({
                studentId: "",
                amount: 50,
                reason: "Actividad completada",
            }),
        ).rejects.toThrow();
    });

    it("rechaza XP cero o negativa", async () => {
        await expect(
            awardXPHandler({
                studentId,
                amount: 0,
                reason: "Actividad completada",
            }),
        ).rejects.toThrow();

        await expect(
            awardXPHandler({
                studentId,
                amount: -10,
                reason: "Actividad completada",
            }),
        ).rejects.toThrow();
    });

    it("rechaza reason vacío", async () => {
        await expect(
            awardXPHandler({
                studentId,
                amount: 50,
                reason: "",
            }),
        ).rejects.toThrow();
    });

    it("rechaza un perfil de gamificación inexistente", async () => {
        await expect(
            awardXPHandler({
                studentId: "student-without-profile",
                amount: 50,
                reason: "Actividad completada",
            }),
        ).rejects.toThrow();
    });
});
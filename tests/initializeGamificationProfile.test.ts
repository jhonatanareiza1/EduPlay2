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
    initializeGamificationProfileHandler,
} from "../src/functions/gamification/initializeGamificationProfile";

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

const testStudentIds = [
    "student-gamification-001",
    "student-gamification-002",
    "student-gamification-003",
    "student-gamification-004",
    "student-gamification-005",
];

describe("initializeGamificationProfile", () => {
    beforeAll(async () => {
        for (const studentId of testStudentIds) {
            await database
                .collection("gamificationProfiles")
                .doc(studentId)
                .delete();
        }
    });

    beforeEach(async () => {
        for (const studentId of testStudentIds) {
            await database
                .collection("gamificationProfiles")
                .doc(studentId)
                .delete();
        }
    });

    it("crea correctamente un perfil de gamificación", async () => {
        const studentId =
            "student-gamification-001";

        const result =
            await initializeGamificationProfileHandler(
                {
                    studentId,
                },
                {
                    uid: studentId,
                },
            );

        expect(result).toEqual({
            studentId,
            created: true,
        });

        const profileSnapshot =
            await database
                .collection("gamificationProfiles")
                .doc(studentId)
                .get();

        expect(profileSnapshot.exists).toBe(true);

        const profile =
            profileSnapshot.data();

        expect(profile?.studentId).toBe(
            studentId,
        );

        expect(profile?.totalXP).toBe(0);
        expect(profile?.level).toBe(1);
        expect(profile?.coins).toBe(0);

        expect(profile?.currentStreak).toBe(0);
        expect(profile?.bestStreak).toBe(0);

        expect(profile?.subjects).toEqual({
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
        });

        expect(profile?.lastActivityAt).toBeNull();

        expect(
            profile?.createdAt,
        ).toBeDefined();

        expect(
            profile?.updatedAt,
        ).toBeDefined();
    });

    it("no duplica un perfil existente", async () => {
        const studentId =
            "student-gamification-002";

        const first =
            await initializeGamificationProfileHandler(
                {
                    studentId,
                },
                {
                    uid: studentId,
                },
            );

        const second =
            await initializeGamificationProfileHandler(
                {
                    studentId,
                },
                {
                    uid: studentId,
                },
            );

        expect(first).toEqual({
            studentId,
            created: true,
        });

        expect(second).toEqual({
            studentId,
            created: false,
        });

        const profileSnapshot =
            await database
                .collection("gamificationProfiles")
                .doc(studentId)
                .get();

        expect(profileSnapshot.exists).toBe(true);

        expect(
            profileSnapshot.data()?.totalXP,
        ).toBe(0);

        expect(
            profileSnapshot.data()?.coins,
        ).toBe(0);
    });

    it("rechaza una llamada sin autenticación", async () => {
        await expect(
            initializeGamificationProfileHandler(
                {
                    studentId:
                        "student-gamification-003",
                },
                null,
            ),
        ).rejects.toThrow();
    });

    it("rechaza studentId vacío", async () => {
        await expect(
            initializeGamificationProfileHandler(
                {
                    studentId: "",
                },
                {
                    uid:
                        "student-gamification-004",
                },
            ),
        ).rejects.toThrow();
    });

    it("impide crear el perfil de otro estudiante", async () => {
        await expect(
            initializeGamificationProfileHandler(
                {
                    studentId:
                        "student-gamification-005",
                },
                {
                    uid:
                        "otro-estudiante-005",
                },
            ),
        ).rejects.toThrow();
    });
});
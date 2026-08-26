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
    updateProgressHandler,
} from "../src/functions/progress/updateProgress";

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
    "student-progress-test-001";

describe("updateProgress", () => {
    beforeAll(async () => {
        await database
            .collection("progress")
            .doc(studentId)
            .delete();
    });

    beforeEach(async () => {
        await database
            .collection("progress")
            .doc(studentId)
            .delete();
    });

    it("crea correctamente el progreso", async () => {
        const result =
            await updateProgressHandler(
                {
                    studentId,
                    activityId:
                        "activity-progress-001",
                    subjectId:
                        "mathematics",
                    score: 8,
                    totalPoints: 10,
                    passed: true,
                },
                {
                    uid: studentId,
                },
            );

        expect(result).toEqual({
            studentId,
            activityId:
                "activity-progress-001",
            subjectId:
                "mathematics",
            score: 8,
            totalPoints: 10,
            percentage: 80,
            passed: true,
        });

        const snapshot =
            await database
                .collection("progress")
                .doc(studentId)
                .get();

        expect(snapshot.exists).toBe(true);

        expect(snapshot.data()).toMatchObject({
            studentId,
            activitiesCompleted: 1,
            passedActivities: 1,
            totalScore: 8,
            totalPoints: 10,
            averagePercentage: 80,
            lastActivityId:
                "activity-progress-001",
            lastScore: 8,
            lastPercentage: 80,
            lastPassed: true,
        });

        expect(
            snapshot.data()?.subjects,
        ).toMatchObject({
            mathematics: {
                activitiesCompleted: 1,
                passedActivities: 1,
                totalScore: 8,
                totalPoints: 10,
                percentage: 80,
                lastActivityId:
                    "activity-progress-001",
                lastScore: 8,
                lastPercentage: 80,
                lastPassed: true,
            },
        });
    });

    it("acumula varias actividades", async () => {
        await updateProgressHandler(
            {
                studentId,
                activityId:
                    "activity-progress-001",
                subjectId:
                    "mathematics",
                score: 8,
                totalPoints: 10,
                passed: true,
            },
            {
                uid: studentId,
            },
        );

        await updateProgressHandler(
            {
                studentId,
                activityId:
                    "activity-progress-002",
                subjectId:
                    "mathematics",
                score: 5,
                totalPoints: 10,
                passed: false,
            },
            {
                uid: studentId,
            },
        );

        const snapshot =
            await database
                .collection("progress")
                .doc(studentId)
                .get();

        expect(snapshot.data()).toMatchObject({
            activitiesCompleted: 2,
            passedActivities: 1,
            totalScore: 13,
            totalPoints: 20,
            averagePercentage: 65,
            lastActivityId:
                "activity-progress-002",
            lastScore: 5,
            lastPercentage: 50,
            lastPassed: false,
        });

        expect(
            snapshot.data()?.subjects,
        ).toMatchObject({
            mathematics: {
                activitiesCompleted: 2,
                passedActivities: 1,
                totalScore: 13,
                totalPoints: 20,
                percentage: 65,
                lastActivityId:
                    "activity-progress-002",
                lastScore: 5,
                lastPercentage: 50,
                lastPassed: false,
            },
        });
    });

    it("mantiene separadas las materias", async () => {
        await updateProgressHandler(
            {
                studentId,
                activityId:
                    "activity-mathematics-001",
                subjectId:
                    "mathematics",
                score: 9,
                totalPoints: 10,
                passed: true,
            },
            {
                uid: studentId,
            },
        );

        await updateProgressHandler(
            {
                studentId,
                activityId:
                    "activity-english-001",
                subjectId:
                    "english",
                score: 6,
                totalPoints: 10,
                passed: false,
            },
            {
                uid: studentId,
            },
        );

        const snapshot =
            await database
                .collection("progress")
                .doc(studentId)
                .get();

        expect(
            snapshot.data()?.subjects,
        ).toMatchObject({
            mathematics: {
                activitiesCompleted: 1,
                passedActivities: 1,
                totalScore: 9,
                totalPoints: 10,
                percentage: 90,
            },

            english: {
                activitiesCompleted: 1,
                passedActivities: 0,
                totalScore: 6,
                totalPoints: 10,
                percentage: 60,
            },
        });
    });

    it("rechaza una llamada sin autenticación", async () => {
        await expect(
            updateProgressHandler(
                {
                    studentId,
                    activityId:
                        "activity-progress-003",
                    subjectId:
                        "mathematics",
                    score: 10,
                    totalPoints: 10,
                    passed: true,
                },
                null,
            ),
        ).rejects.toThrow();
    });

    it("impide modificar el progreso de otro estudiante", async () => {
        await expect(
            updateProgressHandler(
                {
                    studentId,
                    activityId:
                        "activity-progress-004",
                    subjectId:
                        "mathematics",
                    score: 10,
                    totalPoints: 10,
                    passed: true,
                },
                {
                    uid: "otro-estudiante",
                },
            ),
        ).rejects.toThrow();
    });

    it("rechaza score inválido", async () => {
        await expect(
            updateProgressHandler(
                {
                    studentId,
                    activityId:
                        "activity-progress-005",
                    subjectId:
                        "mathematics",
                    score: -1,
                    totalPoints: 10,
                    passed: true,
                },
                {
                    uid: studentId,
                },
            ),
        ).rejects.toThrow();
    });

    it("rechaza score superior al total", async () => {
        await expect(
            updateProgressHandler(
                {
                    studentId,
                    activityId:
                        "activity-progress-006",
                    subjectId:
                        "mathematics",
                    score: 11,
                    totalPoints: 10,
                    passed: true,
                },
                {
                    uid: studentId,
                },
            ),
        ).rejects.toThrow();
    });

    it("rechaza totalPoints inválido", async () => {
        await expect(
            updateProgressHandler(
                {
                    studentId,
                    activityId:
                        "activity-progress-007",
                    subjectId:
                        "mathematics",
                    score: 5,
                    totalPoints: 0,
                    passed: true,
                },
                {
                    uid: studentId,
                },
            ),
        ).rejects.toThrow();
    });

    it("rechaza subjectId vacío", async () => {
        await expect(
            updateProgressHandler(
                {
                    studentId,
                    activityId:
                        "activity-progress-008",
                    subjectId: "",
                    score: 5,
                    totalPoints: 10,
                    passed: true,
                },
                {
                    uid: studentId,
                },
            ),
        ).rejects.toThrow();
    });
});
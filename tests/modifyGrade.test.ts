import { describe, expect, it } from "vitest";

import {
    getApps,
    initializeApp,
} from "firebase-admin/app";

import {
    getFirestore,
} from "firebase-admin/firestore";

import {
    modifyGradeHandler,
} from "../src/functions/grades/modifyGrade";

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

const db =
    getFirestore();

describe("modifyGrade", () => {
    it("permite modificar una calificación válida", async () => {
        const gradeId =
            "grade-test-001";

        const studentId =
            "student-test-001";

        const teacherId =
            "teacher-test-001";

        await db
            .collection("grades")
            .doc(gradeId)
            .set({
                studentId,
                teacherId,
                activityId:
                    "activity-test-001",
                subjectId:
                    "mathematics",
                grade:
                    8,
                baseGrade:
                    8,
                academicBonus:
                    1,
                finalGrade:
                    9,
                createdAt:
                    new Date(),
                updatedAt:
                    new Date(),
            });

        const result =
            await modifyGradeHandler(
                {
                    gradeId,
                    studentId,
                    grade:
                        8.5,
                    reason:
                        "Corrección de calificación",
                },
                {
                    uid:
                        teacherId,
                },
            );

        expect(result).toEqual({
            gradeId,
            studentId,
            grade:
                9.5,
            reason:
                "Corrección de calificación",
            modifiedBy:
                teacherId,
        });

        const gradeSnapshot =
            await db
                .collection("grades")
                .doc(gradeId)
                .get();

        expect(
            gradeSnapshot.exists,
        ).toBe(true);

        expect(
            gradeSnapshot.data(),
        ).toMatchObject({
            studentId,
            teacherId,
            grade:
                9.5,
            baseGrade:
                8.5,
            academicBonus:
                1,
            finalGrade:
                9.5,
        });

        const changesSnapshot =
            await db
                .collection("gradeChanges")
                .where(
                    "gradeId",
                    "==",
                    gradeId,
                )
                .get();

        expect(
            changesSnapshot.empty,
        ).toBe(false);

        expect(
            changesSnapshot.docs[0].data(),
        ).toMatchObject({
            gradeId,
            studentId,
            changedBy:
                teacherId,
            previousGrade:
                9,
            newGrade:
                9.5,
            type:
                "grade",
            reason:
                "Corrección de calificación",
            achievementId:
                null,
            bonus:
                0,
        });
    });

    it("rechaza una llamada sin autenticación", async () => {
        await expect(
            modifyGradeHandler(
                {
                    gradeId:
                        "grade-test-002",
                    studentId:
                        "student-test-001",
                    grade:
                        8,
                    reason:
                        "Corrección",
                },
                null,
            ),
        ).rejects.toThrow();
    });

    it("rechaza una calificación menor que 0", async () => {
        await expect(
            modifyGradeHandler(
                {
                    gradeId:
                        "grade-test-003",
                    studentId:
                        "student-test-001",
                    grade:
                        -1,
                    reason:
                        "Corrección",
                },
                {
                    uid:
                        "teacher-test-001",
                },
            ),
        ).rejects.toThrow();
    });

    it("rechaza una calificación mayor que 10", async () => {
        await expect(
            modifyGradeHandler(
                {
                    gradeId:
                        "grade-test-004",
                    studentId:
                        "student-test-001",
                    grade:
                        11,
                    reason:
                        "Corrección",
                },
                {
                    uid:
                        "teacher-test-001",
                },
            ),
        ).rejects.toThrow();
    });

    it("rechaza un motivo vacío", async () => {
        await expect(
            modifyGradeHandler(
                {
                    gradeId:
                        "grade-test-005",
                    studentId:
                        "student-test-001",
                    grade:
                        8,
                    reason:
                        "",
                },
                {
                    uid:
                        "teacher-test-001",
                },
            ),
        ).rejects.toThrow();
    });

})
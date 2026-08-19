import { describe, expect, it } from "vitest";

import {
    modifyGradeHandler,
} from "../src/functions/grades/modifyGrade";

describe("modifyGrade", () => {
    it("permite modificar una calificación válida", () => {
        const result = modifyGradeHandler(
            {
                gradeId: "grade-test-001",
                studentId: "student-test-001",
                grade: 8.5,
                reason: "Corrección de calificación",
            },
            {
                uid: "teacher-test-001",
            },
        );

        expect(result).toEqual({
            gradeId: "grade-test-001",
            studentId: "student-test-001",
            grade: 8.5,
            reason: "Corrección de calificación",
            modifiedBy: "teacher-test-001",
        });
    });

    it("rechaza una llamada sin autenticación", () => {
        expect(() =>
            modifyGradeHandler(
                {
                    gradeId: "grade-test-001",
                    studentId: "student-test-001",
                    grade: 8,
                    reason: "Corrección",
                },
                null,
            ),
        ).toThrow();
    });

    it("rechaza una calificación menor que 0", () => {
        expect(() =>
            modifyGradeHandler(
                {
                    gradeId: "grade-test-001",
                    studentId: "student-test-001",
                    grade: -1,
                    reason: "Corrección",
                },
                {
                    uid: "teacher-test-001",
                },
            ),
        ).toThrow();
    });

    it("rechaza una calificación mayor que 10", () => {
        expect(() =>
            modifyGradeHandler(
                {
                    gradeId: "grade-test-001",
                    studentId: "student-test-001",
                    grade: 11,
                    reason: "Corrección",
                },
                {
                    uid: "teacher-test-001",
                },
            ),
        ).toThrow();
    });

    it("rechaza un motivo vacío", () => {
        expect(() =>
            modifyGradeHandler(
                {
                    gradeId: "grade-test-001",
                    studentId: "student-test-001",
                    grade: 8,
                    reason: "",
                },
                {
                    uid: "teacher-test-001",
                },
            ),
        ).toThrow();
    });
});
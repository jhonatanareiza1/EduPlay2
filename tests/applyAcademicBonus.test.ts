import { describe, expect, it } from "vitest";

import {
    applyAcademicBonusHandler,
} from "../src/functions/grades/applyAcademicBonus";

describe("applyAcademicBonus", () => {
    it("permite aplicar un bonus válido", () => {
        const result = applyAcademicBonusHandler(
            {
                studentId: "student-test-001",
                achievementId: "achievement-test-001",
                bonus: 0.5,
                reason: "Logro académico especial",
            },
            {
                uid: "teacher-test-001",
            },
        );

        expect(result).toEqual({
            studentId: "student-test-001",
            achievementId: "achievement-test-001",
            bonus: 0.5,
            reason: "Logro académico especial",
            appliedBy: "teacher-test-001",
        });
    });

    it("rechaza una llamada sin autenticación", () => {
        expect(() =>
            applyAcademicBonusHandler(
                {
                    studentId: "student-test-001",
                    achievementId: "achievement-test-001",
                    bonus: 0.5,
                    reason: "Bonus",
                },
                null,
            ),
        ).toThrow();
    });

    it("rechaza un bonus igual a 0", () => {
        expect(() =>
            applyAcademicBonusHandler(
                {
                    studentId: "student-test-001",
                    achievementId: "achievement-test-001",
                    bonus: 0,
                    reason: "Bonus",
                },
                {
                    uid: "teacher-test-001",
                },
            ),
        ).toThrow();
    });

    it("rechaza un bonus negativo", () => {
        expect(() =>
            applyAcademicBonusHandler(
                {
                    studentId: "student-test-001",
                    achievementId: "achievement-test-001",
                    bonus: -1,
                    reason: "Bonus",
                },
                {
                    uid: "teacher-test-001",
                },
            ),
        ).toThrow();
    });

    it("rechaza un motivo vacío", () => {
        expect(() =>
            applyAcademicBonusHandler(
                {
                    studentId: "student-test-001",
                    achievementId: "achievement-test-001",
                    bonus: 0.5,
                    reason: "",
                },
                {
                    uid: "teacher-test-001",
                },
            ),
        ).toThrow();
    });
});
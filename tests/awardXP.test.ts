import { describe, expect, it } from "vitest";

import {
    awardXPHandler,
} from "../src/functions/gamification/awardXP";

describe("awardXP", () => {
    it("permite otorgar XP válida", () => {
        const result = awardXPHandler({
            studentId: "student-test-001",
            amount: 50,
            reason: "Actividad completada",
        });

        expect(result).toEqual({
            studentId: "student-test-001",
            amount: 50,
            reason: "Actividad completada",
        });
    });

    it("rechaza studentId vacío", () => {
        expect(() =>
            awardXPHandler({
                studentId: "",
                amount: 50,
                reason: "Actividad completada",
            }),
        ).toThrow();
    });

    it("rechaza XP cero o negativa", () => {
        expect(() =>
            awardXPHandler({
                studentId: "student-test-001",
                amount: 0,
                reason: "Actividad completada",
            }),
        ).toThrow();
    });

    it("rechaza reason vacío", () => {
        expect(() =>
            awardXPHandler({
                studentId: "student-test-001",
                amount: 50,
                reason: "",
            }),
        ).toThrow();
    });
});
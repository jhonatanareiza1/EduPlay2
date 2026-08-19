import { describe, expect, it } from "vitest";

import {
    awardCoinsHandler,
} from "../src/functions/gamification/awardCoins";

describe("awardCoins", () => {
    it("permite otorgar EduCoins válidas", () => {
        const result = awardCoinsHandler({
            studentId: "student-test-001",
            amount: 25,
            reason: "Actividad completada",
        });

        expect(result).toEqual({
            studentId: "student-test-001",
            amount: 25,
            reason: "Actividad completada",
        });
    });

    it("rechaza studentId vacío", () => {
        expect(() =>
            awardCoinsHandler({
                studentId: "",
                amount: 25,
                reason: "Actividad completada",
            }),
        ).toThrow();
    });

    it("rechaza cantidad cero o negativa", () => {
        expect(() =>
            awardCoinsHandler({
                studentId: "student-test-001",
                amount: 0,
                reason: "Actividad completada",
            }),
        ).toThrow();
    });

    it("rechaza reason vacío", () => {
        expect(() =>
            awardCoinsHandler({
                studentId: "student-test-001",
                amount: 25,
                reason: "",
            }),
        ).toThrow();
    });
});
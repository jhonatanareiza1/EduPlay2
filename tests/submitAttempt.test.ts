import { describe, expect, it } from "vitest";

import {
  submitAttemptHandler,
} from "../src/functions/attempts/submitAttempt";

describe("submitAttemptHandler", () => {
  it("rechaza una llamada sin autenticación", async () => {
    await expect(
      submitAttemptHandler(
        {
          activityId: "activity-001",
          studentId: "student-001",
          answers: {},
        },
        null,
      ),
    ).rejects.toMatchObject({
      code: "unauthenticated",
    });
  });

  it("impide enviar un intento para otro estudiante", async () => {
    await expect(
      submitAttemptHandler(
        {
          activityId: "activity-001",
          studentId: "student-002",
          answers: {},
        },
        {
          uid: "student-001",
        },
      ),
    ).rejects.toMatchObject({
      code: "permission-denied",
    });
  });

  it("rechaza activityId vacío", async () => {
    await expect(
      submitAttemptHandler(
        {
          activityId: "",
          studentId: "student-001",
          answers: {},
        },
        {
          uid: "student-001",
        },
      ),
    ).rejects.toMatchObject({
      code: "invalid-argument",
    });
  });

  it("rechaza studentId vacío", async () => {
    await expect(
      submitAttemptHandler(
        {
          activityId: "activity-001",
          studentId: "",
          answers: {},
        },
        {
          uid: "student-001",
        },
      ),
    ).rejects.toMatchObject({
      code: "invalid-argument",
    });
  });
});
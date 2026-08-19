import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import {
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from "@firebase/rules-unit-testing";

import {
  doc,
  getDoc,
  setDoc,
} from "firebase/firestore";

import {
  beforeAll,
  afterAll,
  beforeEach,
  describe,
  expect,
  it,
} from "vitest";

import {
  submitAttemptHandler,
} from "../src/functions/attempts/submitAttempt";

let testEnv: RulesTestEnvironment;

const PROJECT_ID = "eduplay-test";

beforeAll(async () => {
  testEnv = await initializeTestEnvironment({
    projectId: PROJECT_ID,
    firestore: {
      host: "127.0.0.1",
      port: 8081,
      rules: readFileSync(
        resolve(process.cwd(), "../firestore.rules"),
        "utf8",
      ),
    },
  });
});

afterAll(async () => {
  if (testEnv) {
    await testEnv.cleanup();
  }
});

beforeEach(async () => {
  await testEnv.clearFirestore();
});

describe("submitAttempt - integración", () => {
  it("crea un intento válido", async () => {
    const studentId = "student-test-001";
    const activityId = "activity-test-001";

    await testEnv.withSecurityRulesDisabled(
      async (context) => {
        const db = context.firestore();

        await setDoc(
          doc(db, "students", studentId),
          {
            userId: studentId,
          },
        );

        await setDoc(
          doc(db, "activities", activityId),
          {
            title: "Actividad de prueba",
            ownerTeacherId: "teacher-test-001",
          },
        );
      },
    );

    const result = await submitAttemptHandler(
      {
        activityId,
        studentId,
        answers: {
          question1: "respuesta",
        },
      },
      {
        uid: studentId,
      },
    );

    expect(result.success).toBe(true);
    expect(result.attemptId).toBeDefined();

    const context =
      testEnv.authenticatedContext(studentId);

    const attemptSnap = await getDoc(
      doc(
        context.firestore(),
        "attempts",
        result.attemptId,
      ),
    );

    expect(attemptSnap.exists()).toBe(true);

    expect(attemptSnap.data()).toMatchObject({
      studentId,
      activityId,
      answers: {
        question1: "respuesta",
      },
      status: "submitted",
    });
  });
});
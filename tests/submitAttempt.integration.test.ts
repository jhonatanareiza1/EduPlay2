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

const PROJECT_ID =
  "eduplay-test";

beforeAll(async () => {
  testEnv =
    await initializeTestEnvironment({
      projectId: PROJECT_ID,

      firestore: {
        host: "127.0.0.1",
        port: 8081,

        rules: readFileSync(
          resolve(
            process.cwd(),
            "../firestore.rules",
          ),
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

describe(
  "submitAttempt - integración",
  () => {
    it("crea un intento y calcula el score en backend", async () => {
      const studentId =
        "student-test-001";

      const activityId =
        "activity-test-001";

      const configId =
        "config-test-001";

      await testEnv
        .withSecurityRulesDisabled(
          async (context) => {
            const db =
              context.firestore();

            await setDoc(
              doc(
                db,
                "students",
                studentId,
              ),
              {
                userId:
                  studentId,
              },
            );

            await setDoc(
              doc(
                db,
                "activities",
                activityId,
              ),
              {
                title:
                  "Actividad de prueba",

                ownerTeacherId:
                  "teacher-test-001",

                configId,

                type: "quiz",

                isPublished:
                  true,
              },
            );

            await setDoc(
              doc(
                db,
                "activityConfigs",
                configId,
              ),
              {
                activityId,

                ownerTeacherId:
                  "teacher-test-001",

                questions: [
                  {
                    id: "question1",
                    type:
                      "multiple-choice",
                    text:
                      "Pregunta 1",
                    options: [
                      {
                        id:
                          "option-a",
                        text:
                          "Correcta",
                      },
                      {
                        id:
                          "option-b",
                        text:
                          "Incorrecta",
                      },
                    ],
                    points: 5,
                  },
                  {
                    id: "question2",
                    type:
                      "multiple-choice",
                    text:
                      "Pregunta 2",
                    options: [
                      {
                        id:
                          "option-a",
                        text:
                          "Incorrecta",
                      },
                      {
                        id:
                          "option-b",
                        text:
                          "Correcta",
                      },
                    ],
                    points: 5,
                  },
                ],
                passingScore: 6,
              },
            );

            await setDoc(
              doc(
                db,
                "activityAnswerKeys",
                activityId,
              ),
              {
                activityId,

                ownerTeacherId:
                  "teacher-test-001",

                answers: {
                  question1:
                    "option-a",

                  question2:
                    "option-b",
                },
              },
            );
          },
        );

      const result =
        await submitAttemptHandler(
          {
            activityId,
            studentId,

            answers: {
              question1:
                "option-a",

              question2:
                "option-b",
            },
          },
          {
            uid: studentId,
          },
        );

      expect(result.success)
        .toBe(true);

      expect(result.attemptId)
        .toBeDefined();

      expect(result.score)
        .toBe(10);

      expect(result.correctAnswers)
        .toBe(2);

      expect(result.totalQuestions)
        .toBe(2);

      expect(result.passed)
        .toBe(true);

      const context =
        testEnv.authenticatedContext(
          studentId,
        );

      const attemptSnap =
        await getDoc(
          doc(
            context.firestore(),
            "attempts",
            result.attemptId,
          ),
        );

      expect(
        attemptSnap.exists(),
      ).toBe(true);

      expect(
        attemptSnap.data(),
      ).toMatchObject({
        studentId,
        activityId,

        answers: {
          question1:
            "option-a",

          question2:
            "option-b",
        },

        score: 10,
        correctAnswers: 2,
        totalQuestions: 2,
        passed: true,
        status: "submitted",
      });
    });

    it("rechaza una actividad sin configuración", async () => {
      const studentId =
        "student-test-002";

      const activityId =
        "activity-test-002";

      await testEnv
        .withSecurityRulesDisabled(
          async (context) => {
            const db =
              context.firestore();

            await setDoc(
              doc(
                db,
                "students",
                studentId,
              ),
              {
                userId:
                  studentId,
              },
            );

            await setDoc(
              doc(
                db,
                "activities",
                activityId,
              ),
              {
                title:
                  "Actividad inválida",

                ownerTeacherId:
                  "teacher-test-001",

                configId:
                  "config-missing",
              },
            );
          },
        );

      await expect(
        submitAttemptHandler(
          {
            activityId,
            studentId,

            answers: {
              question1:
                "option-a",
            },
          },
          {
            uid: studentId,
          },
        ),
      ).rejects.toMatchObject({
        code: "not-found",
      });
    });
  },
);
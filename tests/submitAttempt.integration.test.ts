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

import {
  createActivityHandler,
} from "../src/functions/activities/createActivity";

let testEnv: RulesTestEnvironment;

const PROJECT_ID =
  "eduplay-test";

beforeAll(async () => {
  testEnv =
    await initializeTestEnvironment({
      projectId:
        PROJECT_ID,

      firestore: {
        host:
          "127.0.0.1",

        port:
          8081,

        rules:
          readFileSync(
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
    it(
      "crea un intento, calcula el score y entrega XP/EduCoins",
      async () => {
        const studentId =
          "student-test-001";

        const activityId =
          "activity-test-001";

        const configId =
          "config-test-001";

        const attemptId =
          "attempt-test-001";

        await testEnv
          .withSecurityRulesDisabled(
            async (context) => {
              const db =
                context.firestore();

              await setDoc(
                doc(
                  db,
                  "users",
                  studentId,
                ),
                {
                  uid:
                    studentId,

                  role:
                    "student",

                  name:
                    "Estudiante de prueba",
                },
              );

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

                  type:
                    "quiz",

                  isPublished:
                    true,

                  subjectId:
                    "mathematics",
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
                      id:
                        "question1",

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

                      points:
                        5,
                    },

                    {
                      id:
                        "question2",

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

                      points:
                        5,
                    },
                  ],

                  passingScore:
                    6,
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

              await setDoc(
                doc(
                  db,
                  "gamificationProfiles",
                  studentId,
                ),
                {
                  studentId,

                  totalXP:
                    0,

                  level:
                    1,

                  coins:
                    0,

                  currentStreak:
                    0,

                  bestStreak:
                    0,

                  subjects: {
                    mathematics: {
                      percentage:
                        0,

                      level:
                        1,

                      label:
                        "Básico",
                    },

                    english: {
                      percentage:
                        0,

                      level:
                        1,

                      label:
                        "Básico",
                    },

                    science: {
                      percentage:
                        0,

                      level:
                        1,

                      label:
                        "Básico",
                    },

                    history: {
                      percentage:
                        0,

                      level:
                        1,

                      label:
                        "Básico",
                    },
                  },

                  lastActivityAt:
                    null,

                  createdAt:
                    new Date(),

                  updatedAt:
                    new Date(),
                },
              );

              await setDoc(
                doc(
                  db,
                  "achievements",
                  "first-victory",
                ),
                {
                  name:
                    "Primera victoria",

                  description:
                    "Completar una actividad con éxito.",
                },
              );

              await setDoc(
                doc(
                  db,
                  "achievements",
                  "perfect-score",
                ),
                {
                  name:
                    "Puntuación perfecta",

                  description:
                    "Obtener una puntuación perfecta.",
                },
              );
            },
          );

        const result =
          await submitAttemptHandler(
            {
              activityId,

              studentId,

              attemptId,

              answers: {
                question1:
                  "option-a",

                question2:
                  "option-b",
              },
            },
            {
              uid:
                studentId,
            },
          );

        expect(
          result.success,
        ).toBe(true);

        expect(
          result.attemptId,
        ).toBe(attemptId);

        expect(
          result.score,
        ).toBe(10);

        expect(
          result.totalPoints,
        ).toBe(10);

        expect(
          result.correctAnswers,
        ).toBe(2);

        expect(
          result.totalQuestions,
        ).toBe(2);

        expect(
          result.passed,
        ).toBe(true);

        expect(
          result.gamification.xp,
        ).toBe(20);

        expect(
          result.gamification.totalXP,
        ).toBe(20);

        expect(
          result.gamification.coins,
        ).toBe(10);

        expect(
          result.gamification.totalCoins,
        ).toBe(10);

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

          score:
            10,

          totalPoints:
            10,

          correctAnswers:
            2,

          totalQuestions:
            2,

          passed:
            true,

          status:
            "submitted",

          gamification: {
            scorePercentage:
              100,

            xp:
              20,

            coins:
              10,

            rewarded:
              true,
          },
        });

        const profileSnap =
          await getDoc(
            doc(
              context.firestore(),
              "gamificationProfiles",
              studentId,
            ),
          );

        expect(
          profileSnap.exists(),
        ).toBe(true);

        expect(
          profileSnap.data(),
        ).toMatchObject({
          studentId,

          totalXP:
            20,

          level:
            1,

          coins:
            10,
        });

        /*
         * Repetimos exactamente el mismo intento.
         *
         * El mismo attemptId debe devolver
         * el resultado existente sin volver a
         * entregar XP ni EduCoins.
         */

        const duplicateResult =
          await submitAttemptHandler(
            {
              activityId,

              studentId,

              attemptId,

              answers: {
                question1:
                  "option-a",

                question2:
                  "option-b",
              },
            },
            {
              uid:
                studentId,
            },
          );

        expect(
          duplicateResult.success,
        ).toBe(true);

        expect(
          duplicateResult.attemptId,
        ).toBe(attemptId);

        expect(
          duplicateResult.score,
        ).toBe(10);

        expect(
          duplicateResult.totalPoints,
        ).toBe(10);

        expect(
          duplicateResult.correctAnswers,
        ).toBe(2);

        expect(
          duplicateResult.totalQuestions,
        ).toBe(2);

        expect(
          duplicateResult.passed,
        ).toBe(true);

        expect(
          duplicateResult.gamification.xp,
        ).toBe(20);

        expect(
          duplicateResult.gamification.totalXP,
        ).toBe(20);

        expect(
          duplicateResult.gamification.coins,
        ).toBe(10);

        expect(
          duplicateResult.gamification.totalCoins,
        ).toBe(10);

        /*
         * Verificamos que el perfil NO haya recibido
         * las recompensas nuevamente.
         */

        const profileAfterDuplicateSnap =
          await getDoc(
            doc(
              context.firestore(),
              "gamificationProfiles",
              studentId,
            ),
          );

        expect(
          profileAfterDuplicateSnap.exists(),
        ).toBe(true);

        expect(
          profileAfterDuplicateSnap.data(),
        ).toMatchObject({
          studentId,

          totalXP:
            20,

          level:
            1,

          coins:
            10,
        });
      },
    );

    it(
      "rechaza una actividad sin configuración",
      async () => {
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
                  "users",
                  studentId,
                ),
                {
                  uid:
                    studentId,

                  role:
                    "student",

                  name:
                    "Estudiante de prueba",
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
                    "Actividad sin configuración",

                  ownerTeacherId:
                    "teacher-test-001",

                  configId:
                    "missing-config",

                  type:
                    "quiz",

                  isPublished:
                    true,

                  subjectId:
                    "mathematics",
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
              uid:
                studentId,
            },
          ),
        ).rejects.toThrow();
      },
    );

    it(
      "rechaza reutilizar un attemptId para otro estudiante",
      async () => {
        const studentId =
          "student-test-003";

        const otherStudentId =
          "student-test-004";

        const activityId =
          "activity-test-003";

        const configId =
          "config-test-003";

        const attemptId =
          "attempt-test-003";

        await testEnv
          .withSecurityRulesDisabled(
            async (context) => {
              const db =
                context.firestore();

              await setDoc(
                doc(
                  db,
                  "users",
                  studentId,
                ),
                {
                  uid:
                    studentId,

                  role:
                    "student",

                  name:
                    "Estudiante 3",
                },
              );

              await setDoc(
                doc(
                  db,
                  "users",
                  otherStudentId,
                ),
                {
                  uid:
                    otherStudentId,

                  role:
                    "student",

                  name:
                    "Estudiante 4",
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
                    "Actividad de seguridad",

                  ownerTeacherId:
                    "teacher-test-001",

                  configId,

                  type:
                    "quiz",

                  isPublished:
                    true,

                  subjectId:
                    "mathematics",
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
                      id:
                        "question1",

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

                      points:
                        5,
                    },
                  ],

                  passingScore:
                    5,
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
                  },
                },
              );

              await setDoc(
                doc(
                  db,
                  "gamificationProfiles",
                  studentId,
                ),
                {
                  studentId,

                  totalXP:
                    0,

                  level:
                    1,

                  coins:
                    0,

                  currentStreak:
                    0,

                  bestStreak:
                    0,

                  subjects: {},

                  lastActivityAt:
                    null,

                  createdAt:
                    new Date(),

                  updatedAt:
                    new Date(),
                },
              );

              await setDoc(
                doc(
                  db,
                  "gamificationProfiles",
                  otherStudentId,
                ),
                {
                  studentId:
                    otherStudentId,

                  totalXP:
                    0,

                  level:
                    1,

                  coins:
                    0,

                  currentStreak:
                    0,

                  bestStreak:
                    0,

                  subjects: {},

                  lastActivityAt:
                    null,

                  createdAt:
                    new Date(),

                  updatedAt:
                    new Date(),
                },
              );

              await setDoc(
                doc(
                  db,
                  "attempts",
                  attemptId,
                ),
                {
                  studentId,

                  activityId,

                  answers: {
                    question1:
                      "option-a",
                  },

                  score:
                    5,

                  totalPoints:
                    5,

                  correctAnswers:
                    1,

                  totalQuestions:
                    1,

                  passed:
                    true,

                  status:
                    "submitted",

                  gamification: {
                    scorePercentage:
                      100,

                    xp:
                      20,

                    coins:
                      10,

                    rewarded:
                      true,
                  },

                  createdAt:
                    new Date(),
                },
              );
            },
          );

        await expect(
          submitAttemptHandler(
            {
              activityId,

              studentId:
                otherStudentId,

              attemptId,

              answers: {
                question1:
                  "option-a",
              },
            },
            {
              uid:
                otherStudentId,
            },
          ),
        ).rejects.toThrow(
          "El attemptId ya pertenece a otro intento.",
        );

        const otherProfileSnap =
          await getDoc(
            doc(
              testEnv
                .authenticatedContext(
                  otherStudentId,
                )
                .firestore(),
              "gamificationProfiles",
              otherStudentId,
            ),
          );

        expect(
          otherProfileSnap.data(),
        ).toMatchObject({
          totalXP:
            0,

          coins:
            0,
        });
      },
    );

    it(
      "crea una actividad con createActivity y permite enviarla con submitAttempt",
      async () => {
        const teacherId =
          "teacher-create-flow-001";

        const studentId =
          "student-create-flow-001";

        const attemptId =
          "attempt-create-flow-001";

        await testEnv
          .withSecurityRulesDisabled(
            async (context) => {
              const db =
                context.firestore();

              await setDoc(
                doc(
                  db,
                  "users",
                  studentId,
                ),
                {
                  uid:
                    studentId,

                  role:
                    "student",

                  name:
                    "Estudiante integración",
                },
              );

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
                  "gamificationProfiles",
                  studentId,
                ),
                {
                  studentId,

                  totalXP:
                    0,

                  level:
                    1,

                  coins:
                    0,

                  currentStreak:
                    0,

                  bestStreak:
                    0,

                  subjects: {
                    mathematics: {
                      percentage:
                        0,

                      level:
                        1,

                      label:
                        "Básico",
                    },

                    english: {
                      percentage:
                        0,

                      level:
                        1,

                      label:
                        "Básico",
                    },

                    science: {
                      percentage:
                        0,

                      level:
                        1,

                      label:
                        "Básico",
                    },

                    history: {
                      percentage:
                        0,

                      level:
                        1,

                      label:
                        "Básico",
                    },
                  },

                  lastActivityAt:
                    null,

                  createdAt:
                    new Date(),

                  updatedAt:
                    new Date(),
                },
              );

              await setDoc(
                doc(
                  db,
                  "achievements",
                  "first-victory",
                ),
                {
                  name:
                    "Primera victoria",

                  description:
                    "Completar una actividad con éxito.",
                },
              );

              await setDoc(
                doc(
                  db,
                  "achievements",
                  "perfect-score",
                ),
                {
                  name:
                    "Puntuación perfecta",

                  description:
                    "Obtener una puntuación perfecta.",
                },
              );
            },
          );

        const created =
          await createActivityHandler(
            {
              title:
                "Actividad creada por integración",

              description:
                "Prueba del flujo completo",

              type:
                "quiz",

              subjectId:
                "mathematics",

              questions: [
                {
                  id:
                    "question1",

                  type:
                    "multiple-choice",

                  text:
                    "¿Cuánto es 2 + 2?",

                  options: [
                    {
                      id:
                        "option-a",

                      text:
                        "3",
                    },

                    {
                      id:
                        "option-b",

                      text:
                        "4",
                    },
                  ],

                  points:
                    5,

                  correctAnswer:
                    "option-b",
                },

                {
                  id:
                    "question2",

                  type:
                    "multiple-choice",

                  text:
                    "¿Cuánto es 3 + 3?",

                  options: [
                    {
                      id:
                        "option-a",

                      text:
                        "6",
                    },

                    {
                      id:
                        "option-b",

                      text:
                        "7",
                    },
                  ],

                  points:
                    5,

                  correctAnswer:
                    "option-a",
                },
              ],

              passingScore:
                6,

              isPublished:
                true,
            },
            {
              uid:
                teacherId,
            },
          );

        expect(
          created.activityId,
        ).toBeTruthy();

        expect(
          created.configId,
        ).toBeTruthy();

        /*
         * Verificamos los documentos internos creados
         * por createActivityHandler.
         *
         * Estas lecturas se realizan con las reglas
         * deshabilitadas porque activityAnswerKeys
         * contiene las respuestas correctas y no debe
         * ser accesible directamente por el estudiante.
         */

        await testEnv
          .withSecurityRulesDisabled(
            async (context) => {
              const db =
                context.firestore();

              const activitySnap =
                await getDoc(
                  doc(
                    db,
                    "activities",
                    created.activityId,
                  ),
                );

              expect(
                activitySnap.exists(),
              ).toBe(true);

              expect(
                activitySnap.data(),
              ).toMatchObject({
                title:
                  "Actividad creada por integración",

                description:
                  "Prueba del flujo completo",

                ownerTeacherId:
                  teacherId,

                subjectId:
                  "mathematics",

                configId:
                  created.configId,

                type:
                  "quiz",

                isPublished:
                  true,
              });

              const configSnap =
                await getDoc(
                  doc(
                    db,
                    "activityConfigs",
                    created.configId,
                  ),
                );

              expect(
                configSnap.exists(),
              ).toBe(true);

              expect(
                configSnap.data(),
              ).toMatchObject({
                activityId:
                  created.activityId,

                ownerTeacherId:
                  teacherId,

                passingScore:
                  6,
              });

              expect(
                configSnap.data()?.questions,
              ).toHaveLength(2);

              const answerKeySnap =
                await getDoc(
                  doc(
                    db,
                    "activityAnswerKeys",
                    created.activityId,
                  ),
                );

              expect(
                answerKeySnap.exists(),
              ).toBe(true);

              expect(
                answerKeySnap.data(),
              ).toMatchObject({
                activityId:
                  created.activityId,

                ownerTeacherId:
                  teacherId,

                answers: {
                  question1:
                    "option-b",

                  question2:
                    "option-a",
                },
              });
            },
          );

        const result =
          await submitAttemptHandler(
            {
              activityId:
                created.activityId,

              studentId,

              attemptId,

              answers: {
                question1:
                  "option-b",

                question2:
                  "option-a",
              },
            },
            {
              uid:
                studentId,
            },
          );

        expect(
          result.success,
        ).toBe(true);

        expect(
          result.attemptId,
        ).toBe(attemptId);

        expect(
          result.score,
        ).toBe(10);

        expect(
          result.totalPoints,
        ).toBe(10);

        expect(
          result.correctAnswers,
        ).toBe(2);

        expect(
          result.totalQuestions,
        ).toBe(2);

        expect(
          result.passed,
        ).toBe(true);

        expect(
          result.gamification.xp,
        ).toBe(20);

        expect(
          result.gamification.totalXP,
        ).toBe(20);

        expect(
          result.gamification.coins,
        ).toBe(10);

        expect(
          result.gamification.totalCoins,
        ).toBe(10);

        const context =
          testEnv.authenticatedContext(
            studentId,
          );

        const attemptSnap =
          await getDoc(
            doc(
              context.firestore(),
              "attempts",
              attemptId,
            ),
          );

        expect(
          attemptSnap.exists(),
        ).toBe(true);

        expect(
          attemptSnap.data(),
        ).toMatchObject({
          studentId,

          activityId:
            created.activityId,

          answers: {
            question1:
              "option-b",

            question2:
              "option-a",
          },

          score:
            10,

          totalPoints:
            10,

          correctAnswers:
            2,

          totalQuestions:
            2,

          passed:
            true,

          status:
            "submitted",

          gamification: {
            scorePercentage:
              100,

            xp:
              20,

            coins:
              10,

            rewarded:
              true,
          },
        });

        const profileSnap =
          await getDoc(
            doc(
              context.firestore(),
              "gamificationProfiles",
              studentId,
            ),
          );

        expect(
          profileSnap.exists(),
        ).toBe(true);

        expect(
          profileSnap.data(),
        ).toMatchObject({
          studentId,

          totalXP:
            20,

          level:
            1,

          coins:
            10,
        });
      },
    );
  },
);
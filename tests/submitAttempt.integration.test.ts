import {

  beforeEach,

  describe,

  expect,

  it,

} from "vitest";

import {

  getFirestore,

} from "firebase-admin/firestore";

import {

  submitAttemptHandler,

} from "../src/functions/attempts/submitAttempt";

import {

  createActivityHandler,

} from "../src/functions/activities/createActivity";

const projectId =

  process.env.GCLOUD_PROJECT ??

  "eduplay-test";

const firestoreHost =

  "127.0.0.1";

const firestorePort =

  8081;

const db =

  getFirestore();

beforeEach(async () => {

  const response =

    await fetch(

      `http://${firestoreHost}:${firestorePort}/emulator/v1/projects/${projectId}/databases/(default)/documents`,

      {

        method:

          "DELETE",

      },

    );

  if (!response.ok) {

    throw new Error(

      `No se pudo limpiar Firestore Emulator: ${response.status} ${response.statusText}`,

    );

  }

});

describe(

  "submitAttemptHandler integration",

  () => {

    it(

      "creates an attempt, awards rewards and prevents duplicate submission",

      async () => {

        const studentId =

          "student-submit-001";

        const teacherId =

          "teacher-submit-001";

        await db

          .collection("users")

          .doc(studentId)

          .set({

            role:

              "student",

          });

        await db

          .collection("students")

          .doc(studentId)

          .set({

            userId:

              studentId,

          });

        await db

          .collection("users")

          .doc(teacherId)

          .set({

            role:

              "teacher",

          });

        await db

          .collection("activities")

          .doc("activity-submit-001")

          .set({

            title:

              "Actividad integración",

            type:

              "quiz",

            ownerTeacherId:

              teacherId,

            subjectId:

              "mathematics",

            configId:

              "activity-submit-001",

            isPublished:

              true,

          });

        await db

          .collection("activityConfigs")

          .doc("activity-submit-001")

          .set({

            activityId:

              "activity-submit-001",

            ownerTeacherId:

              teacherId,

            passingScore:

              1,

            questions: [

              {

                id:

                  "question-submit-001",

                type:

                  "multiple-choice",

                text:

                  "2 + 2",

                options: [

                  {

                    id:

                      "option-3",

                    text:

                      "3",

                  },

                  {

                    id:

                      "option-4",

                    text:

                      "4",

                  },

                ],

                points:

                  1,

              },

            ],

          });

        await db

          .collection("activityAnswerKeys")

          .doc("activity-submit-001")

          .set({

            activityId:

              "activity-submit-001",

            ownerTeacherId:

              teacherId,

            answers: {

              "question-submit-001":

                "4",

            },

          });

        await db

          .collection("gamificationProfiles")

          .doc(studentId)

          .set({

            studentId,

            xp:

              0,

            coins:

              0,

          });

        await db

          .collection("achievements")

          .doc("first-victory")

          .set({

            id:

              "first-victory",

            name:

              "First Victory",

            requirement:

            {

              type:

                "activitiesCompleted",

              value:

                1,

            },

          });

        await db

          .collection("achievements")

          .doc("perfect-score")

          .set({

            id:

              "perfect-score",

            name:

              "Perfect Score",

            requirement:

            {

              type:

                "perfectScore",

              value:

                1,

            },

          });

        const result =

          await submitAttemptHandler(

            {

              studentId,

              activityId:

                "activity-submit-001",

              answers:

              {

                "question-submit-001":

                  "4",

              },

              attemptId:

                "attempt-submit-001",

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

        ).toBe(

          "attempt-submit-001",

        );

        expect(

          result.score,

        ).toBe(1);

        expect(

          result.totalPoints,

        ).toBe(1);

        expect(

          result.passed,

        ).toBe(true);

        expect(

          result.xpAwarded,

        ).toBe(20);

        expect(

          result.coinsAwarded,

        ).toBe(10);

        const attemptSnapshot =

          await db

            .collection("attempts")

            .doc("attempt-submit-001")

            .get();

        expect(

          attemptSnapshot.exists,

        ).toBe(true);

        expect(

          attemptSnapshot.data()

            ?.gamification

            ?.rewarded,

        ).toBe(true);

        const duplicateResult =

          await submitAttemptHandler(

            {

              studentId,

              activityId:

                "activity-submit-001",

              answers:

              {

                "question-submit-001":

                  "4",

              },

              attemptId:

                "attempt-submit-001",

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

        ).toBe(

          "attempt-submit-001",

        );

      },

    );

    it(

      "rejects submission when the activity configuration does not exist",

      async () => {

        const studentId =

          "student-submit-002";

        const teacherId =

          "teacher-submit-002";

        await db

          .collection("users")

          .doc(studentId)

          .set({

            role:

              "student",

          });

        await db

          .collection("students")

          .doc(studentId)

          .set({

            userId:

              studentId,

          });

        await db

          .collection("users")

          .doc(teacherId)

          .set({

            role:

              "teacher",

          });

        await db

          .collection("activities")

          .doc("activity-submit-002")

          .set({

            title:

              "Actividad sin configuración",

            type:

              "quiz",

            ownerTeacherId:

              teacherId,

            subjectId:

              "mathematics",

            configId:

              "missing-config-submit-002",

            isPublished:

              true,

          });

        await expect(

          submitAttemptHandler(

            {

              studentId,

              activityId:

                "activity-submit-002",

              answers:

              {},

              attemptId:

                "attempt-submit-002",

            },

            {

              uid:

                studentId,

            },

          ),

        ).rejects.toMatchObject({

          code:

            "not-found",

        });

      },

    );

    it(

      "rejects reuse of an attemptId by another student",

      async () => {

        const firstStudentId =

          "student-submit-003-a";

        const secondStudentId =

          "student-submit-003-b";

        const teacherId =

          "teacher-submit-003";

        await db

          .collection("users")

          .doc(firstStudentId)

          .set({

            role:

              "student",

          });

        await db

          .collection("students")

          .doc(firstStudentId)

          .set({

            userId:

              firstStudentId,

          });

        await db

          .collection("users")

          .doc(secondStudentId)

          .set({

            role:

              "student",

          });

        await db

          .collection("students")

          .doc(secondStudentId)

          .set({

            userId:

              secondStudentId,

          });

        await db

          .collection("users")

          .doc(teacherId)

          .set({

            role:

              "teacher",

          });

        await db

          .collection("activities")

          .doc("activity-submit-003")

          .set({

            title:

              "Actividad duplicada",

            type:

              "quiz",

            ownerTeacherId:

              teacherId,

            subjectId:

              "mathematics",

            configId:

              "activity-submit-003",

            isPublished:

              true,

          });

        await db

          .collection("activityConfigs")

          .doc("activity-submit-003")

          .set({

            activityId:

              "activity-submit-003",

            ownerTeacherId:

              teacherId,

            passingScore:

              1,

            questions: [

              {

                id:

                  "question-submit-003",

                type:

                  "multiple-choice",

                text:

                  "2 + 2",

                options: [

                  {

                    id:

                      "option-3",

                    text:

                      "3",

                  },

                  {

                    id:

                      "option-4",

                    text:

                      "4",

                  },

                ],

                points:

                  1,

              },

            ],

          });

        await db

          .collection("activityAnswerKeys")

          .doc("activity-submit-003")

          .set({

            activityId:

              "activity-submit-003",

            ownerTeacherId:

              teacherId,

            answers: {

              "question-submit-003":

                "4",

            },

          });

        await db

          .collection("gamificationProfiles")

          .doc(firstStudentId)

          .set({

            studentId:

              firstStudentId,

            xp:

              0,

            coins:

              0,

          });

        await db

          .collection("gamificationProfiles")

          .doc(secondStudentId)

          .set({

            studentId:

              secondStudentId,

            xp:

              0,

            coins:

              0,

          });

        await db

          .collection("achievements")

          .doc("first-victory")

          .set({

            id:

              "first-victory",

            name:

              "First Victory",

            requirement:

            {

              type:

                "activitiesCompleted",

              value:

                1,

            },

          });

        await db

          .collection("achievements")

          .doc("perfect-score")

          .set({

            id:

              "perfect-score",

            name:

              "Perfect Score",

            requirement:

            {

              type:

                "perfectScore",

              value:

                1,

            },

          });

        await submitAttemptHandler(

          {

            studentId:

              firstStudentId,

            activityId:

              "activity-submit-003",

            answers:

            {

              "question-submit-003":

                "4",

            },

            attemptId:

              "attempt-submit-003",

          },

          {

            uid:

              firstStudentId,

          },

        );

        await expect(

          submitAttemptHandler(

            {

              studentId:

                secondStudentId,

              activityId:

                "activity-submit-003",

              answers:

              {

                "question-submit-003":

                  "4",

              },

              attemptId:

                "attempt-submit-003",

            },

            {

              uid:

                secondStudentId,

            },

          ),

        ).rejects.toMatchObject({

          code:

            "already-exists",

        });

      },

    );

    it(

      "creates an activity and submits an attempt successfully",

      async () => {

        const studentId =

          "student-submit-004";

        const teacherId =

          "teacher-submit-004";

        await db

          .collection("users")

          .doc(studentId)

          .set({

            role:

              "student",

          });

        await db

          .collection("students")

          .doc(studentId)

          .set({

            userId:

              studentId,

          });

        const activityResult =

          await createActivityHandler(

            {

              title:

                "Actividad creada por integración",

              type:

                "quiz",

              subjectId:

                "mathematics",

              questions: [

                {

                  id:

                    "question-submit-004",

                  type:

                    "multiple-choice",

                  text:

                    "2 + 2",

                  options: [

                    {

                      id:

                        "option-3",

                      text:

                        "3",

                    },

                    {

                      id:

                        "option-4",

                      text:

                        "4",

                    },

                  ],

                  correctAnswer:

                    "4",

                  points:

                    1,

                },

              ],

              passingScore:

                1,

              isPublished:

                true,

            },

            {

              uid:

                teacherId,

            },

          );

        await db

          .collection("gamificationProfiles")

          .doc(studentId)

          .set({

            studentId,

            xp:

              0,

            coins:

              0,

          });

        await db

          .collection("achievements")

          .doc("first-victory")

          .set({

            id:

              "first-victory",

            name:

              "First Victory",

            requirement:

            {

              type:

                "activitiesCompleted",

              value:

                1,

            },

          });

        await db

          .collection("achievements")

          .doc("perfect-score")

          .set({

            id:

              "perfect-score",

            name:

              "Perfect Score",

            requirement:

            {

              type:

                "perfectScore",

              value:

                1,

            },

          });

        const result =

          await submitAttemptHandler(

            {

              studentId,

              activityId:

                activityResult.activityId,

              answers:

              {

                "question-submit-004":

                  "4",

              },

              attemptId:

                "attempt-submit-004",

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

          result.activity.id,

        ).toBe(

          activityResult.activityId,

        );

        expect(

          result.score,

        ).toBe(1);

        expect(

          result.passed,

        ).toBe(true);

      },

    );

    it(

      "completes a student activity assignment after submitting an attempt",

      async () => {

        const studentId =

          "student-submit-005";

        const teacherId =

          "teacher-submit-005";

        const assignmentId =

          "assignment-submit-005";

        await db

          .collection("users")

          .doc(studentId)

          .set({

            role:

              "student",

          });

        await db

          .collection("students")

          .doc(studentId)

          .set({

            userId:

              studentId,

          });

        await db

          .collection("users")

          .doc(teacherId)

          .set({

            role:

              "teacher",

          });

        await db

          .collection("activities")

          .doc("activity-submit-005")

          .set({

            title:

              "Actividad asignada",

            type:

              "quiz",

            ownerTeacherId:

              teacherId,

            subjectId:

              "mathematics",

            configId:

              "activity-submit-005",

            isPublished:

              true,

          });

        await db

          .collection("activityConfigs")

          .doc("activity-submit-005")

          .set({

            activityId:

              "activity-submit-005",

            ownerTeacherId:

              teacherId,

            passingScore:

              1,

            questions: [

              {

                id:

                  "question-submit-005",

                type:

                  "multiple-choice",

                text:

                  "2 + 2",

                options: [

                  {

                    id:

                      "option-3",

                    text:

                      "3",

                  },

                  {

                    id:

                      "option-4",

                    text:

                      "4",

                  },

                ],

                points:

                  1,

              },

            ],

          });

        await db

          .collection("activityAnswerKeys")

          .doc("activity-submit-005")

          .set({

            activityId:

              "activity-submit-005",

            ownerTeacherId:

              teacherId,

            answers: {

              "question-submit-005":

                "4",

            },

          });

        await db

          .collection("gamificationProfiles")

          .doc(studentId)

          .set({

            studentId,

            xp:

              0,

            coins:

              0,

          });

        await db

          .collection("achievements")

          .doc("first-victory")

          .set({

            id:

              "first-victory",

            name:

              "First Victory",

            requirement:

            {

              type:

                "activitiesCompleted",

              value:

                1,

            },

          });

        await db

          .collection("achievements")

          .doc("perfect-score")

          .set({

            id:

              "perfect-score",

            name:

              "Perfect Score",

            requirement:

            {

              type:

                "perfectScore",

              value:

                1,

            },

          });

        await db

          .collection("activityAssignments")

          .doc(assignmentId)

          .set({

            activityId:

              "activity-submit-005",

            assignedBy:

              teacherId,

            targetType:

              "student",

            targetId:

              studentId,

            status:

              "assigned",

            createdAt:

              new Date(),

          });

        const result =

          await submitAttemptHandler(

            {

              studentId,

              activityId:

                "activity-submit-005",

              answers:

              {

                "question-submit-005":

                  "4",

              },

              attemptId:

                "attempt-submit-005",

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

          result.passed,

        ).toBe(true);

        const assignmentSnapshot =

          await db

            .collection("activityAssignments")

            .doc(assignmentId)

            .get();

        expect(

          assignmentSnapshot.exists,

        ).toBe(true);

        expect(

          assignmentSnapshot.data()

            ?.status,

        ).toBe("completed");

        expect(

          assignmentSnapshot.data()

            ?.completedBy,

        ).toBe(studentId);

        expect(

          assignmentSnapshot.data()

            ?.completedAt,

        ).toBeDefined();

      },

    );

  },

);
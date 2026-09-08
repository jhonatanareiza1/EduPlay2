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
    afterAll,
    beforeAll,
    beforeEach,
    describe,
    expect,
    it,
} from "vitest";

import {
    createGradeHandler,
} from "../src/functions/grades/createGrade";

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
    "createGrade - integración",
    () => {
        it(
            "crea una calificación y la guarda en Firestore",
            async () => {
                const studentId =
                    "student-grade-001";

                const teacherId =
                    "teacher-grade-001";

                const activityId =
                    "activity-grade-001";

                const configId =
                    "config-grade-001";

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
                                        "Estudiante de calificación",
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
                                        "Actividad calificable",
                                    ownerTeacherId:
                                        teacherId,
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
                                        teacherId,
                                    questions: [
                                        {
                                            id:
                                                "question1",
                                            type:
                                                "multiple-choice",
                                            question:
                                                "¿Cuánto es 2 + 2?",
                                            options: [
                                                "option-a",
                                                "option-b",
                                            ],
                                            points:
                                                1,
                                        },
                                    ],
                                    passingScore:
                                        0,
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
                                        teacherId,
                                    answers: {
                                        question1:
                                            "option-a",
                                    },
                                },
                            );
                        },
                    );

                const result =
                    await createGradeHandler(
                        {
                            studentId,
                            teacherId,
                            activityId,
                            grade:
                                8.5,
                        },
                        {
                            uid:
                                teacherId,
                        },
                    );

                expect(
                    result.gradeId,
                ).toBeTruthy();

                expect(
                    result.studentId,
                ).toBe(studentId);

                expect(
                    result.teacherId,
                ).toBe(teacherId);

                expect(
                    result.activityId,
                ).toBe(activityId);

                expect(
                    result.subjectId,
                ).toBe("mathematics");

                expect(
                    result.grade,
                ).toBe(8.5);

                expect(
                    result.baseGrade,
                ).toBe(8.5);

                expect(
                    result.academicBonus,
                ).toBe(0);

                expect(
                    result.finalGrade,
                ).toBe(8.5);

                await testEnv
                    .withSecurityRulesDisabled(
                        async (context) => {
                            const gradeSnap =
                                await getDoc(
                                    doc(
                                        context.firestore(),
                                        "grades",
                                        result.gradeId,
                                    ),
                                );

                            expect(
                                gradeSnap.exists(),
                            ).toBe(true);

                            expect(
                                gradeSnap.data(),
                            ).toMatchObject({
                                studentId,
                                teacherId,
                                activityId,
                                subjectId:
                                    "mathematics",
                                grade:
                                    8.5,
                                baseGrade:
                                    8.5,
                                academicBonus:
                                    0,
                                finalGrade:
                                    8.5,
                            });

                            expect(
                                gradeSnap.data()
                                    ?.createdAt,
                            ).toBeTruthy();

                            expect(
                                gradeSnap.data()
                                    ?.updatedAt,
                            ).toBeTruthy();
                        },
                    );
            },
        );

        it(
            "rechaza crear una calificación para otro docente",
            async () => {
                const studentId =
                    "student-grade-002";

                const teacherId =
                    "teacher-grade-002";

                const otherTeacherId =
                    "teacher-grade-003";

                const activityId =
                    "activity-grade-002";

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
                                        "Actividad protegida",
                                    ownerTeacherId:
                                        teacherId,
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
                    createGradeHandler(
                        {
                            studentId,
                            teacherId,
                            activityId,
                            grade:
                                7,
                        },
                        {
                            uid:
                                otherTeacherId,
                        },
                    ),
                ).rejects.toThrow();
            },
        );

        it(
            "rechaza una actividad que pertenece a otro docente",
            async () => {
                const studentId =
                    "student-grade-003";

                const teacherId =
                    "teacher-grade-004";

                const activityOwnerId =
                    "teacher-grade-005";

                const activityId =
                    "activity-grade-003";

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
                                        "Actividad de otro docente",
                                    ownerTeacherId:
                                        activityOwnerId,
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
                    createGradeHandler(
                        {
                            studentId,
                            teacherId,
                            activityId,
                            grade:
                                9,
                        },
                        {
                            uid:
                                teacherId,
                        },
                    ),
                ).rejects.toThrow();
            },
        );

        it(
            "rechaza una calificación fuera del rango 0 a 10",
            async () => {
                await expect(
                    createGradeHandler(
                        {
                            studentId:
                                "student-grade-004",
                            teacherId:
                                "teacher-grade-006",
                            activityId:
                                "activity-grade-004",
                            grade:
                                10.1,
                        },
                        {
                            uid:
                                "teacher-grade-006",
                        },
                    ),
                ).rejects.toThrow();

                await expect(
                    createGradeHandler(
                        {
                            studentId:
                                "student-grade-004",
                            teacherId:
                                "teacher-grade-006",
                            activityId:
                                "activity-grade-004",
                            grade:
                                -0.1,
                        },
                        {
                            uid:
                                "teacher-grade-006",
                        },
                    ),
                ).rejects.toThrow();
            },
        );
    },
);
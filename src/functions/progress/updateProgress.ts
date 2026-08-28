import {
    getApps,
    initializeApp,
} from "firebase-admin/app";

import {
    getFirestore,
} from "firebase-admin/firestore";

import {
    HttpsError,
} from "firebase-functions/v2/https";

process.env.FIRESTORE_EMULATOR_HOST ??=
    "127.0.0.1:8081";

const projectId =
    process.env.GCLOUD_PROJECT
    ?? "eduplay-test";

if (getApps().length === 0) {
    initializeApp({
        projectId,
    });
}

export interface UpdateProgressData {
    studentId: string;
    activityId: string;
    subjectId: string;
    score: number;
    totalPoints: number;
    passed: boolean;
}

export interface UpdateProgressAuth {
    uid: string;
}

export interface UpdateProgressResult {
    studentId: string;
    activityId: string;
    subjectId: string;
    score: number;
    totalPoints: number;
    percentage: number;
    passed: boolean;
    counted: boolean;
}

interface SubjectProgressData {
    activitiesCompleted: number;
    passedActivities: number;
    totalScore: number;
    totalPoints: number;
    percentage: number;
    lastActivityId?: string;
    lastScore?: number;
    lastPercentage?: number;
    lastPassed?: boolean;
}

interface GlobalProgressData {
    activitiesCompleted: number;
    passedActivities: number;
    totalScore: number;
    totalPoints: number;
    averagePercentage: number;
    lastActivityId?: string;
    lastScore?: number;
    lastPercentage?: number;
    lastPassed?: boolean;
}

const SUBJECTS = [
    "mathematics",
    "english",
    "science",
    "history",
] as const;

type SubjectId =
    typeof SUBJECTS[number];

function isSubjectId(
    value: string,
): value is SubjectId {
    return (
        (
            SUBJECTS as readonly string[]
        ).includes(value)
    );
}

function createEmptySubjectProgress():
    SubjectProgressData {
    return {
        activitiesCompleted: 0,
        passedActivities: 0,
        totalScore: 0,
        totalPoints: 0,
        percentage: 0,
    };
}

function normalizeSubjectProgress(
    value: unknown,
): SubjectProgressData {
    if (
        !value ||
        typeof value !== "object" ||
        Array.isArray(value)
    ) {
        return createEmptySubjectProgress();
    }

    const data =
        value as Record<string, unknown>;

    return {
        activitiesCompleted:
            typeof data.activitiesCompleted === "number"
                ? data.activitiesCompleted
                : 0,

        passedActivities:
            typeof data.passedActivities === "number"
                ? data.passedActivities
                : 0,

        totalScore:
            typeof data.totalScore === "number"
                ? data.totalScore
                : 0,

        totalPoints:
            typeof data.totalPoints === "number"
                ? data.totalPoints
                : 0,

        percentage:
            typeof data.percentage === "number"
                ? data.percentage
                : 0,

        ...(typeof data.lastActivityId === "string"
            ? {
                lastActivityId:
                    data.lastActivityId,
            }
            : {}),

        ...(typeof data.lastScore === "number"
            ? {
                lastScore:
                    data.lastScore,
            }
            : {}),

        ...(typeof data.lastPercentage === "number"
            ? {
                lastPercentage:
                    data.lastPercentage,
            }
            : {}),

        ...(typeof data.lastPassed === "boolean"
            ? {
                lastPassed:
                    data.lastPassed,
            }
            : {}),
    };
}

function createEmptyGlobalProgress():
    GlobalProgressData {
    return {
        activitiesCompleted: 0,
        passedActivities: 0,
        totalScore: 0,
        totalPoints: 0,
        averagePercentage: 0,
    };
}

function normalizeGlobalProgress(
    value: unknown,
): GlobalProgressData {
    if (
        !value ||
        typeof value !== "object" ||
        Array.isArray(value)
    ) {
        return createEmptyGlobalProgress();
    }

    const data =
        value as Record<string, unknown>;

    return {
        activitiesCompleted:
            typeof data.activitiesCompleted === "number"
                ? data.activitiesCompleted
                : 0,

        passedActivities:
            typeof data.passedActivities === "number"
                ? data.passedActivities
                : 0,

        totalScore:
            typeof data.totalScore === "number"
                ? data.totalScore
                : 0,

        totalPoints:
            typeof data.totalPoints === "number"
                ? data.totalPoints
                : 0,

        averagePercentage:
            typeof data.averagePercentage === "number"
                ? data.averagePercentage
                : 0,

        ...(typeof data.lastActivityId === "string"
            ? {
                lastActivityId:
                    data.lastActivityId,
            }
            : {}),

        ...(typeof data.lastScore === "number"
            ? {
                lastScore:
                    data.lastScore,
            }
            : {}),

        ...(typeof data.lastPercentage === "number"
            ? {
                lastPercentage:
                    data.lastPercentage,
            }
            : {}),

        ...(typeof data.lastPassed === "boolean"
            ? {
                lastPassed:
                    data.lastPassed,
            }
            : {}),
    };
}

export async function updateProgressHandler(
    data: UpdateProgressData,
    auth: UpdateProgressAuth | null,
): Promise<UpdateProgressResult> {
    if (!auth) {
        throw new HttpsError(
            "unauthenticated",
            "Debes estar autenticado.",
        );
    }

    if (
        !data ||
        typeof data.studentId !== "string" ||
        data.studentId.trim() === ""
    ) {
        throw new HttpsError(
            "invalid-argument",
            "studentId es obligatorio.",
        );
    }

    if (auth.uid !== data.studentId) {
        throw new HttpsError(
            "permission-denied",
            "No puedes actualizar el progreso de otro estudiante.",
        );
    }

    if (
        typeof data.activityId !== "string" ||
        data.activityId.trim() === ""
    ) {
        throw new HttpsError(
            "invalid-argument",
            "activityId es obligatorio.",
        );
    }

    if (
        typeof data.subjectId !== "string" ||
        data.subjectId.trim() === ""
    ) {
        throw new HttpsError(
            "invalid-argument",
            "subjectId es obligatorio.",
        );
    }

    const subjectIdValue =
        data.subjectId;

    if (!isSubjectId(subjectIdValue)) {
        throw new HttpsError(
            "invalid-argument",
            "subjectId no es válido.",
        );
    }

    const subjectId: SubjectId =
        subjectIdValue;

    if (
        typeof data.score !== "number" ||
        !Number.isFinite(data.score) ||
        data.score < 0
    ) {
        throw new HttpsError(
            "invalid-argument",
            "El score no es válido.",
        );
    }

    if (
        typeof data.totalPoints !== "number" ||
        !Number.isFinite(data.totalPoints) ||
        data.totalPoints <= 0
    ) {
        throw new HttpsError(
            "invalid-argument",
            "totalPoints debe ser mayor que 0.",
        );
    }

    if (data.score > data.totalPoints) {
        throw new HttpsError(
            "invalid-argument",
            "El score no puede superar el total de puntos.",
        );
    }

    if (typeof data.passed !== "boolean") {
        throw new HttpsError(
            "invalid-argument",
            "passed debe ser boolean.",
        );
    }

    const percentage =
        Math.round(
            (
                data.score /
                data.totalPoints
            ) * 100,
        );

    const database =
        getFirestore();

    const progressReference =
        database
            .collection("progress")
            .doc(data.studentId);

    const currentDate =
        new Date();

    let counted = false;

    await database.runTransaction(
        async (transaction) => {
            const snapshot =
                await transaction.get(
                    progressReference,
                );

            const current =
                snapshot.exists
                    ? snapshot.data() ?? {}
                    : {};

            /*
             * =========================================
             * SOLO LAS ACTIVIDADES APROBADAS CUENTAN
             * =========================================
             *
             * Un intento fallido NO modifica progreso.
             */

            if (!data.passed) {
                counted = false;
                return;
            }

            /*
             * =========================================
             * ACTIVIDADES YA APROBADAS
             * =========================================
             *
             * Una actividad aprobada anteriormente
             * nunca vuelve a contar ni genera recompensa.
             */

            const existingPassedActivityIds =
                Array.isArray(
                    current.passedActivityIds,
                )
                    ? current.passedActivityIds.filter(
                        (
                            value,
                        ): value is string =>
                            typeof value === "string",
                    )
                    : [];

            if (
                existingPassedActivityIds.includes(
                    data.activityId,
                )
            ) {
                counted = false;
                return;
            }

            counted = true;

            const passedActivityIds =
                [
                    ...existingPassedActivityIds,
                    data.activityId,
                ];

            /*
             * =========================================
             * ACTIVIDADES COMPLETADAS
             * =========================================
             *
             * Como solamente registramos aquí actividades
             * aprobadas, cada actividad aparece una sola vez.
             */

            const existingCompletedActivityIds =
                Array.isArray(
                    current.completedActivityIds,
                )
                    ? current.completedActivityIds.filter(
                        (
                            value,
                        ): value is string =>
                            typeof value === "string",
                    )
                    : [];

            const completedActivityIds =
                existingCompletedActivityIds.includes(
                    data.activityId,
                )
                    ? existingCompletedActivityIds
                    : [
                        ...existingCompletedActivityIds,
                        data.activityId,
                    ];

            /*
             * =========================================
             * PROGRESO GLOBAL
             * =========================================
             */

            const currentGlobal =
                normalizeGlobalProgress(
                    current,
                );

            const newActivitiesCompleted =
                currentGlobal.activitiesCompleted +
                (
                    existingCompletedActivityIds.includes(
                        data.activityId,
                    )
                        ? 0
                        : 1
                );

            const newPassedActivities =
                currentGlobal.passedActivities +
                1;

            const newTotalScore =
                currentGlobal.totalScore +
                data.score;

            const newTotalPoints =
                currentGlobal.totalPoints +
                data.totalPoints;

            const newAveragePercentage =
                newTotalPoints > 0
                    ? Math.round(
                        (
                            newTotalScore /
                            newTotalPoints
                        ) * 100,
                    )
                    : 0;

            /*
             * =========================================
             * PROGRESO POR MATERIA
             * =========================================
             */

            const currentSubjects =
                current.subjects &&
                    typeof current.subjects === "object" &&
                    !Array.isArray(current.subjects)
                    ? current.subjects as Record<
                        string,
                        unknown
                    >
                    : {};

            const subjects: Record<
                SubjectId,
                SubjectProgressData
            > = {
                mathematics:
                    normalizeSubjectProgress(
                        currentSubjects.mathematics,
                    ),

                english:
                    normalizeSubjectProgress(
                        currentSubjects.english,
                    ),

                science:
                    normalizeSubjectProgress(
                        currentSubjects.science,
                    ),

                history:
                    normalizeSubjectProgress(
                        currentSubjects.history,
                    ),
            };

            const currentSubject =
                subjects[subjectId];

            const newSubjectActivitiesCompleted =
                currentSubject.activitiesCompleted +
                (
                    existingCompletedActivityIds.includes(
                        data.activityId,
                    )
                        ? 0
                        : 1
                );

            const newSubjectPassedActivities =
                currentSubject.passedActivities +
                1;

            const newSubjectTotalScore =
                currentSubject.totalScore +
                data.score;

            const newSubjectTotalPoints =
                currentSubject.totalPoints +
                data.totalPoints;

            const newSubjectPercentage =
                newSubjectTotalPoints > 0
                    ? Math.round(
                        (
                            newSubjectTotalScore /
                            newSubjectTotalPoints
                        ) * 100,
                    )
                    : 0;

            subjects[subjectId] = {
                activitiesCompleted:
                    newSubjectActivitiesCompleted,

                passedActivities:
                    newSubjectPassedActivities,

                totalScore:
                    newSubjectTotalScore,

                totalPoints:
                    newSubjectTotalPoints,

                percentage:
                    newSubjectPercentage,

                lastActivityId:
                    data.activityId,

                lastScore:
                    data.score,

                lastPercentage:
                    percentage,

                lastPassed:
                    data.passed,
            };

            /*
             * =========================================
             * DOCUMENTO FINAL
             * =========================================
             */

            const progressData = {
                studentId:
                    data.studentId,

                completedActivityIds,

                passedActivityIds,

                activitiesCompleted:
                    newActivitiesCompleted,

                passedActivities:
                    newPassedActivities,

                totalScore:
                    newTotalScore,

                totalPoints:
                    newTotalPoints,

                averagePercentage:
                    newAveragePercentage,

                lastActivityId:
                    data.activityId,

                lastScore:
                    data.score,

                lastPercentage:
                    percentage,

                lastPassed:
                    data.passed,

                subjects,

                updatedAt:
                    currentDate,

                ...(snapshot.exists
                    ? {}
                    : {
                        createdAt:
                            currentDate,
                    }),
            };

            if (snapshot.exists) {
                transaction.update(
                    progressReference,
                    progressData,
                );
            } else {
                transaction.create(
                    progressReference,
                    progressData,
                );
            }
        },
    );

    return {
        studentId:
            data.studentId,

        activityId:
            data.activityId,

        subjectId:
            data.subjectId,

        score:
            data.score,

        totalPoints:
            data.totalPoints,

        percentage,

        passed:
            data.passed,

        counted,
    };
}
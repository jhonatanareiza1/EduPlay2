import {
    getFirestore,
} from 'firebase-admin/firestore';

import {
    HttpsError,
} from 'firebase-functions/v2/https';

const db = getFirestore();

interface AuthContext {
    uid: string;
}

interface ActivityAttemptAnswerResult {
    questionId: string;
    answer: string | string[];
    answerText?: string | string[];
    isCorrect: boolean;
    pointsEarned: number;
    pointsAvailable: number;
}

interface ActivityAttempt {
    attemptId: string;
    studentId: string;
    activityId: string;
    groupId?: string;
    score: number;
    totalPoints: number;
    correctAnswers: number;
    totalQuestions: number;
    passed: boolean;
    status: string;
    answerResults: ActivityAttemptAnswerResult[];
    gamification?: {
        scorePercentage?: number;
        xp?: number;
        coins?: number;
        totalXP?: number;
        totalCoins?: number;
        rewarded?: boolean;
    };
    createdAt?: unknown;
}

interface ListActivityAttemptsResult {
    attempts: ActivityAttempt[];
}

function serializeTimestamp(
    value: unknown,
): unknown {
    if (
        value &&
        typeof value === 'object' &&
        'toDate' in value &&
        typeof (
            value as {
                toDate?: unknown;
            }
        ).toDate === 'function'
    ) {
        return (
            value as {
                toDate: () => Date;
            }
        ).toDate().toISOString();
    }

    return value;
}

function serializeAnswerResults(
    value: unknown,
): ActivityAttemptAnswerResult[] {
    console.log(
        '[listActivityAttempts] serializeAnswerResults input:',
        JSON.stringify(value),
    );

    console.log(
        '[listActivityAttempts] serializeAnswerResults isArray:',
        Array.isArray(value),
    );

    if (!Array.isArray(value)) {
        return [];
    }

    const serialized =
        value
            .filter(
                (result): result is Record<string, unknown> =>
                    !!result &&
                    typeof result === 'object' &&
                    !Array.isArray(result),
            )
            .filter(
                (result) =>
                    typeof result.questionId === 'string',
            )
            .map(
                (result): ActivityAttemptAnswerResult => {
                    const answer =
                        typeof result.answer === 'string'
                            ? result.answer
                            : Array.isArray(result.answer)
                                ? result.answer.filter(
                                    (
                                        item,
                                    ): item is string =>
                                        typeof item === 'string',
                                )
                                : [];

                    const answerText =
                        typeof result.answerText === 'string'
                            ? result.answerText
                            : Array.isArray(result.answerText)
                                ? result.answerText.filter(
                                    (
                                        item,
                                    ): item is string =>
                                        typeof item === 'string',
                                )
                                : undefined;

                    return {
                        questionId:
                            result.questionId as string,
                        answer,
                        ...(answerText !== undefined
                            ? {
                                answerText,
                            }
                            : {}),
                        isCorrect:
                            result.isCorrect === true,
                        pointsEarned:
                            typeof result.pointsEarned === 'number'
                                ? result.pointsEarned
                                : 0,
                        pointsAvailable:
                            typeof result.pointsAvailable === 'number'
                                ? result.pointsAvailable
                                : 0,
                    };
                },
            );

    console.log(
        '[listActivityAttempts] serializeAnswerResults output:',
        JSON.stringify(serialized),
    );

    return serialized;
}

function serializeAttempt(
    document: FirebaseFirestore.QueryDocumentSnapshot,
): ActivityAttempt {
    const data =
        document.data();

    console.log(
        '[listActivityAttempts] attempt:',
        document.id,
    );

    console.log(
        '[listActivityAttempts] raw attempt data:',
        JSON.stringify(data),
    );

    console.log(
        '[listActivityAttempts] raw answerResults:',
        JSON.stringify(data.answerResults),
    );

    const gamification =
        data.gamification &&
            typeof data.gamification === 'object'
            ? data.gamification
            : undefined;

    return {
        attemptId:
            document.id,
        studentId:
            typeof data.studentId === 'string'
                ? data.studentId
                : '',
        activityId:
            typeof data.activityId === 'string'
                ? data.activityId
                : '',
        ...(typeof data.groupId === 'string'
            ? {
                groupId:
                    data.groupId,
            }
            : {}),
        score:
            typeof data.score === 'number'
                ? data.score
                : 0,
        totalPoints:
            typeof data.totalPoints === 'number'
                ? data.totalPoints
                : 0,
        correctAnswers:
            typeof data.correctAnswers === 'number'
                ? data.correctAnswers
                : 0,
        totalQuestions:
            typeof data.totalQuestions === 'number'
                ? data.totalQuestions
                : 0,
        passed:
            data.passed === true,
        status:
            typeof data.status === 'string'
                ? data.status
                : 'unknown',
        answerResults:
            serializeAnswerResults(
                data.answerResults,
            ),
        ...(gamification
            ? {
                gamification: {
                    ...(typeof gamification.scorePercentage ===
                        'number'
                        ? {
                            scorePercentage:
                                gamification.scorePercentage,
                        }
                        : {}),
                    ...(typeof gamification.xp ===
                        'number'
                        ? {
                            xp:
                                gamification.xp,
                        }
                        : {}),
                    ...(typeof gamification.coins ===
                        'number'
                        ? {
                            coins:
                                gamification.coins,
                        }
                        : {}),
                    ...(typeof gamification.totalXP ===
                        'number'
                        ? {
                            totalXP:
                                gamification.totalXP,
                        }
                        : {}),
                    ...(typeof gamification.totalCoins ===
                        'number'
                        ? {
                            totalCoins:
                                gamification.totalCoins,
                        }
                        : {}),
                    ...(typeof gamification.rewarded ===
                        'boolean'
                        ? {
                            rewarded:
                                gamification.rewarded,
                        }
                        : {}),
                },
            }
            : {}),
        ...(data.createdAt
            ? {
                createdAt:
                    serializeTimestamp(
                        data.createdAt,
                    ),
            }
            : {}),
    };
}

export async function listActivityAttemptsHandler(
    activityId: string,
    auth: AuthContext | null,
): Promise<ListActivityAttemptsResult> {
    console.log(
        '[listActivityAttempts] START',
        JSON.stringify({
            activityId,
            authUid:
                auth?.uid ?? null,
        }),
    );

    if (!auth) {
        throw new HttpsError(
            'unauthenticated',
            'Debes iniciar sesión para consultar los intentos.',
        );
    }

    if (
        !activityId ||
        typeof activityId !== 'string'
    ) {
        throw new HttpsError(
            'invalid-argument',
            'activityId es obligatorio.',
        );
    }

    const activityRef =
        db
            .collection('activities')
            .doc(activityId);

    const activitySnapshot =
        await activityRef.get();

    console.log(
        '[listActivityAttempts] activity snapshot:',
        JSON.stringify({
            activityId,
            exists:
                activitySnapshot.exists,
        }),
    );

    if (!activitySnapshot.exists) {
        throw new HttpsError(
            'not-found',
            'La actividad no existe.',
        );
    }

    const activityData =
        activitySnapshot.data();

    if (!activityData) {
        throw new HttpsError(
            'not-found',
            'No se encontraron los datos de la actividad.',
        );
    }

    const ownerTeacherId =
        typeof activityData.ownerTeacherId ===
            'string'
            ? activityData.ownerTeacherId
            : '';

    console.log(
        '[listActivityAttempts] activity data:',
        JSON.stringify({
            activityId,
            ownerTeacherId,
            subjectId:
                activityData.subjectId ?? null,
            title:
                activityData.title ?? null,
        }),
    );

    if (!ownerTeacherId) {
        throw new HttpsError(
            'failed-precondition',
            'La actividad no tiene un docente propietario válido.',
        );
    }

    const userSnapshot =
        await db
            .collection('users')
            .doc(auth.uid)
            .get();

    console.log(
        '[listActivityAttempts] user snapshot:',
        JSON.stringify({
            uid: auth.uid,
            exists:
                userSnapshot.exists,
        }),
    );

    if (!userSnapshot.exists) {
        throw new HttpsError(
            'not-found',
            'El usuario no existe.',
        );
    }

    const userData =
        userSnapshot.data();

    if (!userData) {
        throw new HttpsError(
            'not-found',
            'No se encontraron los datos del usuario.',
        );
    }

    const role =
        typeof userData.role === 'string'
            ? userData.role
            : '';

    const isTeacher =
        role === 'teacher';

    const isStudent =
        role === 'student';

    console.log(
        '[listActivityAttempts] authorization:',
        JSON.stringify({
            uid: auth.uid,
            role,
            isTeacher,
            isStudent,
            ownerTeacherId,
        }),
    );

    if (!isTeacher && !isStudent) {
        throw new HttpsError(
            'permission-denied',
            'No tienes permiso para consultar estos intentos.',
        );
    }

    /*
     * Diagnóstico:
     * primero consultamos todos los intentos de la actividad,
     * sin filtrar por estudiante, para comprobar que la actividad
     * realmente tiene documentos en attempts.
     */
    const activityAttemptsSnapshot =
        await db
            .collection('attempts')
            .where(
                'activityId',
                '==',
                activityId,
            )
            .get();

    console.log(
        '[listActivityAttempts] attempts for activity:',
        JSON.stringify({
            activityId,
            count:
                activityAttemptsSnapshot.size,
            documents:
                activityAttemptsSnapshot.docs.map(
                    (document) => {
                        const data =
                            document.data();

                        return {
                            attemptId:
                                document.id,
                            studentId:
                                data.studentId ?? null,
                            activityId:
                                data.activityId ?? null,
                            status:
                                data.status ?? null,
                        };
                    },
                ),
        }),
    );

    let query:
        FirebaseFirestore.Query<FirebaseFirestore.DocumentData> =
        db
            .collection('attempts')
            .where(
                'activityId',
                '==',
                activityId,
            );

    if (isStudent) {
        console.log(
            '[listActivityAttempts] applying student filter:',
            JSON.stringify({
                studentId:
                    auth.uid,
            }),
        );

        query =
            query.where(
                'studentId',
                '==',
                auth.uid,
            );
    }

    if (isTeacher) {
        if (ownerTeacherId !== auth.uid) {
            throw new HttpsError(
                'permission-denied',
                'Solo el docente propietario puede consultar estos intentos.',
            );
        }
    }

    const snapshot =
        await query.get();

    console.log(
        '[listActivityAttempts] filtered query result:',
        JSON.stringify({
            activityId,
            authUid:
                auth.uid,
            role,
            count:
                snapshot.size,
            documents:
                snapshot.docs.map(
                    (document) => {
                        const data =
                            document.data();

                        return {
                            attemptId:
                                document.id,
                            studentId:
                                data.studentId ?? null,
                            activityId:
                                data.activityId ?? null,
                        };
                    },
                ),
        }),
    );

    const attempts =
        snapshot.docs
            .map(serializeAttempt)
            .sort(
                (a, b) => {
                    const dateA =
                        typeof a.createdAt === 'string'
                            ? new Date(
                                a.createdAt,
                            ).getTime()
                            : 0;

                    const dateB =
                        typeof b.createdAt === 'string'
                            ? new Date(
                                b.createdAt,
                            ).getTime()
                            : 0;

                    return dateB - dateA;
                },
            );

    console.log(
        '[listActivityAttempts] final attempts:',
        JSON.stringify(
            attempts.map((attempt) => ({
                attemptId:
                    attempt.attemptId,
                studentId:
                    attempt.studentId,
                activityId:
                    attempt.activityId,
                answerResults:
                    attempt.answerResults,
                answerResultsLength:
                    attempt.answerResults.length,
            })),
        ),
    );

    return {
        attempts,
    };
}
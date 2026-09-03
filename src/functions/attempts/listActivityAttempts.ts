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

function serializeAttempt(
    document: FirebaseFirestore.QueryDocumentSnapshot,
): ActivityAttempt {
    const data =
        document.data();

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

    /*
     * DOCENTE:
     * Puede consultar todos los intentos
     * de una actividad que le pertenece.
     */
    if (
        ownerTeacherId ===
        auth.uid
    ) {
        const snapshot =
            await db
                .collection('attempts')
                .where(
                    'activityId',
                    '==',
                    activityId,
                )
                .get();

        const attempts =
            snapshot.docs
                .map(serializeAttempt)
                .sort(
                    (
                        first,
                        second,
                    ) => {
                        const firstDate =
                            typeof first.createdAt ===
                                'string'
                                ? first.createdAt
                                : '';

                        const secondDate =
                            typeof second.createdAt ===
                                'string'
                                ? second.createdAt
                                : '';

                        return secondDate.localeCompare(
                            firstDate,
                        );
                    },
                );

        return {
            attempts,
        };
    }

    /*
     * ESTUDIANTE:
     * Solo puede consultar sus propios intentos.
     */
    const studentSnapshot =
        await db
            .collection('attempts')
            .where(
                'activityId',
                '==',
                activityId,
            )
            .where(
                'studentId',
                '==',
                auth.uid,
            )
            .get();

    const studentAttempts =
        studentSnapshot.docs
            .map(serializeAttempt)
            .sort(
                (
                    first,
                    second,
                ) => {
                    const firstDate =
                        typeof first.createdAt ===
                            'string'
                            ? first.createdAt
                            : '';

                    const secondDate =
                        typeof second.createdAt ===
                            'string'
                            ? second.createdAt
                            : '';

                    return secondDate.localeCompare(
                        firstDate,
                    );
                },
            );

    /*
     * Si no hay intentos propios, devuelve []
     * y nunca expone intentos de otros estudiantes.
     */
    return {
        attempts:
            studentAttempts,
    };
}

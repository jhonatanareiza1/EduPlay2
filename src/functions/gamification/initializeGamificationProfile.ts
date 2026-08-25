import { getApps, initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { HttpsError } from "firebase-functions/v2/https";

process.env.FIRESTORE_EMULATOR_HOST ??= "127.0.0.1:8081";

const projectId =
    process.env.GCLOUD_PROJECT ?? "eduplay-test";

if (getApps().length === 0) {
    initializeApp({
        projectId,
    });
}

interface InitializeGamificationProfileData {
    studentId: string;
}

interface InitializeGamificationProfileAuth {
    uid: string;
}

interface InitializeGamificationProfileResult {
    studentId: string;
    created: boolean;
}

export async function initializeGamificationProfileHandler(
    data: InitializeGamificationProfileData,
    auth: InitializeGamificationProfileAuth | null,
): Promise<InitializeGamificationProfileResult> {
    if (!auth) {
        throw new HttpsError(
            "unauthenticated",
            "Debes iniciar sesión.",
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
            "No puedes crear el perfil de otro estudiante.",
        );
    }

    const database = getFirestore();

    const profileReference = database
        .collection("gamificationProfiles")
        .doc(data.studentId);

    const result = await database.runTransaction(
        async (transaction) => {
            const profileSnapshot =
                await transaction.get(profileReference);

            if (profileSnapshot.exists) {
                return {
                    created: false,
                };
            }

            const currentDate = new Date();

            transaction.create(profileReference, {
                studentId: data.studentId,

                totalXP: 0,
                level: 1,
                coins: 0,

                currentStreak: 0,
                bestStreak: 0,

                subjects: {
                    mathematics: {
                        percentage: 0,
                        level: 1,
                        label: "Básico",
                    },
                    english: {
                        percentage: 0,
                        level: 1,
                        label: "Básico",
                    },
                    science: {
                        percentage: 0,
                        level: 1,
                        label: "Básico",
                    },
                    history: {
                        percentage: 0,
                        level: 1,
                        label: "Básico",
                    },
                },

                lastActivityAt: null,
                createdAt: currentDate,
                updatedAt: currentDate,
            });

            return {
                created: true,
            };
        },
    );

    return {
        studentId: data.studentId,
        created: result.created,
    };
}
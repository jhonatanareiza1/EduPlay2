
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
    process.env.GCLOUD_PROJECT ?? "eduplay-test";

if (getApps().length === 0) {
    initializeApp({
        projectId,
    });
}

export interface StudentActivityDocument {
    id: string;
    title: string;
    description?: string;
    type?: string;
    ownerTeacherId: string;
    subjectId?: string;
    topicId?: string;
    configId?: string;
    isPublished: boolean;
    createdAt?: unknown;
    updatedAt?: unknown;
}

export async function listStudentActivitiesHandler(): Promise<{
    activities: StudentActivityDocument[];
}> {
    const db =
        getFirestore();

    const snapshot =
        await db
            .collection("activities")
            .where(
                "isPublished",
                "==",
                true,
            )
            .get();

    const activities =
        snapshot.docs.map(
            (document) => {
                const data =
                    document.data() as Record<
                        string,
                        unknown
                    >;

                const ownerTeacherId =
                    data.ownerTeacherId;

                if (
                    typeof ownerTeacherId !==
                    "string" ||
                    ownerTeacherId.trim() === ""
                ) {
                    throw new HttpsError(
                        "failed-precondition",
                        `La actividad ${document.id} no tiene un docente propietario válido.`,
                    );
                }

                return {
                    id:
                        document.id,

                    title:
                        typeof data.title ===
                            "string"
                            ? data.title
                            : "Actividad",

                    ...(typeof data.description ===
                        "string"
                        ? {
                            description:
                                data.description,
                        }
                        : {}),

                    ...(typeof data.type ===
                        "string"
                        ? {
                            type:
                                data.type,
                        }
                        : {}),

                    ownerTeacherId,

                    ...(typeof data.subjectId ===
                        "string"
                        ? {
                            subjectId:
                                data.subjectId,
                        }
                        : {}),

                    ...(typeof data.topicId ===
                        "string"
                        ? {
                            topicId:
                                data.topicId,
                        }
                        : {}),

                    ...(typeof data.configId ===
                        "string"
                        ? {
                            configId:
                                data.configId,
                        }
                        : {}),

                    isPublished:
                        true,

                    ...(data.createdAt !==
                        undefined
                        ? {
                            createdAt:
                                data.createdAt,
                        }
                        : {}),

                    ...(data.updatedAt !==
                        undefined
                        ? {
                            updatedAt:
                                data.updatedAt,
                        }
                        : {}),
                };
            },
        );

    return {
        activities,
    };
}


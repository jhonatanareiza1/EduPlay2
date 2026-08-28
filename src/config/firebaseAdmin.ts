import {
    getApps,
    initializeApp,
} from "firebase-admin/app";

import {
    getFirestore,
} from "firebase-admin/firestore";

process.env.FIRESTORE_EMULATOR_HOST ??=
    "127.0.0.1:8081";

const projectId =
    process.env.GCLOUD_PROJECT ??
    "eduplay-test";

const app =
    getApps().length === 0
        ? initializeApp({
            projectId,
        })
        : getApps()[0];

export const db =
    getFirestore(app);

export {
    app,
    projectId,
};
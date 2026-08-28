import { setGlobalOptions } from "firebase-functions";
import { onCall } from "firebase-functions/v2/https";

import { createInvitationHandler } from "./functions/invitations/createInvitation";
import { acceptInvitationHandler } from "./functions/invitations/acceptInvitation";

import { submitAttemptHandler } from "./functions/attempts/submitAttempt";

import { awardXPHandler } from "./functions/gamification/awardXP";
import { awardCoinsHandler } from "./functions/gamification/awardCoins";
import { unlockAchievementHandler } from "./functions/gamification/unlockAchievement";

import { modifyGradeHandler } from "./functions/grades/modifyGrade";
import { applyAcademicBonusHandler } from "./functions/grades/applyAcademicBonus";

import { createClassSessionHandler } from "./functions/sessions/createClassSession";
import { joinClassSessionHandler } from "./functions/sessions/joinClassSession";

import { syncOfflineOperationsHandler } from "./functions/sync/syncOfflineOperations";

import { generateAIContentHandler } from "./functions/ai/generateAIContent";
import { validateAIContentHandler } from "./functions/ai/validateAIContent";

import {
    initializeGamificationProfileHandler,
} from "./functions/gamification/initializeGamificationProfile";

import {
    getActivityForAttempt,
} from "./functions/activities/getActivity";

import {
    createActivityHandler,
} from "./functions/activities/createActivity";

import {
    listStudentActivitiesHandler,
} from "./functions/activities/listStudentActivities";

setGlobalOptions({
    maxInstances: 10,
});

// ============================================================
// INVITATIONS
// ============================================================

export const createInvitation = onCall(
    {
        cors: ["http://localhost:5173"],
    },
    async (request) => {
        return createInvitationHandler(
            request.data,
            request.auth
                ? {
                    uid: request.auth.uid,
                }
                : null,
        );
    },
);

export const acceptInvitation = onCall(
    {
        cors: ["http://localhost:5173"],
    },
    async (request) => {
        return acceptInvitationHandler(
            request.data,
            request.auth
                ? {
                    uid: request.auth.uid,
                }
                : null,
        );
    },
);

// ============================================================
// ATTEMPTS
// ============================================================

export const submitAttempt = onCall(
    {
        cors: ["http://localhost:5173"],
    },
    async (request) => {
        return submitAttemptHandler(
            request.data,
            request.auth
                ? {
                    uid: request.auth.uid,
                }
                : null,
        );
    },
);

// ============================================================
// GAMIFICATION
// ============================================================

export const awardXP = onCall(
    {
        cors: ["http://localhost:5173"],
    },
    async (request) => {
        return awardXPHandler(request.data);
    },
);

export const awardCoins = onCall(
    {
        cors: ["http://localhost:5173"],
    },
    async (request) => {
        return awardCoinsHandler(request.data);
    },
);

export const initializeGamificationProfile = onCall(
    {
        cors: ["http://localhost:5173"],
    },
    async (request) => {
        return initializeGamificationProfileHandler(
            request.data,
            request.auth
                ? {
                    uid: request.auth.uid,
                }
                : null,
        );
    },
);

export const unlockAchievement = onCall(
    {
        cors: ["http://localhost:5173"],
    },
    async (request) => {
        return unlockAchievementHandler(request.data);
    },
);

// ============================================================
// GRADES
// ============================================================

export const modifyGrade = onCall(
    {
        cors: ["http://localhost:5173"],
    },
    async (request) => {
        return modifyGradeHandler(
            request.data,
            request.auth
                ? {
                    uid: request.auth.uid,
                }
                : null,
        );
    },
);

export const applyAcademicBonus = onCall(
    {
        cors: ["http://localhost:5173"],
    },
    async (request) => {
        return applyAcademicBonusHandler(
            request.data,
            request.auth
                ? {
                    uid: request.auth.uid,
                }
                : null,
        );
    },
);

// ============================================================
// CLASS SESSIONS
// ============================================================

export const createClassSession = onCall(
    {
        cors: ["http://localhost:5173"],
    },
    async (request) => {
        return createClassSessionHandler(
            request.data,
            request.auth
                ? {
                    uid: request.auth.uid,
                }
                : null,
        );
    },
);

export const joinClassSession = onCall(
    {
        cors: ["http://localhost:5173"],
    },
    async (request) => {
        return joinClassSessionHandler(
            request.data,
            request.auth
                ? {
                    uid: request.auth.uid,
                }
                : null,
        );
    },
);

// ============================================================
// OFFLINE SYNC
// ============================================================

export const syncOfflineOperations = onCall(
    {
        cors: ["http://localhost:5173"],
    },
    async (request) => {
        return syncOfflineOperationsHandler(
            request.data,
            request.auth
                ? {
                    uid: request.auth.uid,
                }
                : null,
        );
    },
);

// ============================================================
// AI
// ============================================================

export const generateAIContent = onCall(
    {
        cors: ["http://localhost:5173"],
    },
    async (request) => {
        return generateAIContentHandler(
            request.data,
            request.auth
                ? {
                    uid: request.auth.uid,
                }
                : null,
        );
    },
);

export const validateAIContent = onCall(
    {
        cors: ["http://localhost:5173"],
    },
    async (request) => {
        return validateAIContentHandler(
            request.data,
            request.auth
                ? {
                    uid: request.auth.uid,
                }
                : null,
        );
    },
);

// ============================================================
// ACTIVITIES
// ============================================================

export const createActivity = onCall(
    {
        cors: ["http://localhost:5173"],
    },
    async (request) => {
        return createActivityHandler(
            request.data,
            request.auth
                ? {
                    uid: request.auth.uid,
                }
                : null,
        );
    },
);

export const getActivity = onCall(
    {
        cors: ["http://localhost:5173"],
    },
    async (request) => {
        const activityId =
            request.data?.activityId;

        const result =
            await getActivityForAttempt(
                activityId,
            );

        return {
            activity:
                result.activity,

            config:
                result.config,
        };
    },
);

export const listStudentActivities = onCall(
    {
        cors: ["http://localhost:5173"],
    },
    async () => {
        return listStudentActivitiesHandler();
    },
);

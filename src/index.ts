import {
    setGlobalOptions,
} from "firebase-functions/v2";

import {
    onCall,
} from "firebase-functions/v2/https";

import {
    createInvitationHandler,
} from "./functions/invitations/createInvitation";

import {
    acceptInvitationHandler,
} from "./functions/invitations/acceptInvitation";

import {
    submitAttemptHandler,
} from "./functions/attempts/submitAttempt";

import {
    listActivityAttemptsHandler,
} from "./functions/attempts/listActivityAttempts";

import {
    awardXPHandler,
} from "./functions/gamification/awardXP";

import {
    awardCoinsHandler,
} from "./functions/gamification/awardCoins";

import {
    initializeGamificationProfileHandler,
} from "./functions/gamification/initializeGamificationProfile";

import {
    claimDailyChallengeHandler,
} from "./functions/gamification/claimDailyChallenge";

import {
    unlockAchievementHandler,
} from "./functions/achievements/unlockAchievement";

import {
    modifyGradeHandler,
} from "./functions/grades/modifyGrade";

import {
    applyAcademicBonusHandler,
} from "./functions/grades/applyAcademicBonus";

import {
    createClassSessionHandler,
} from "./functions/sessions/createClassSession";

import {
    joinClassSessionHandler,
} from "./functions/sessions/joinClassSession";

import {
    syncOfflineOperationsHandler,
} from "./functions/sync/syncOfflineOperations";

import {
    generateAIContentHandler,
} from "./functions/ai/generateAIContent";

import {
    validateAIContentHandler,
} from "./functions/ai/validateAIContent";

import {
    getActivityForAttempt,
} from "./functions/activities/getActivity";

import {
    createActivityHandler,
} from "./functions/activities/createActivity";

import {
    updateActivityHandler,
} from "./functions/activities/updateActivity";

import {
    listStudentActivitiesHandler,
} from "./functions/activities/listStudentActivities";

import {
    listTeacherActivitiesHandler,
} from "./functions/activities/listTeacherActivities";

import {
    getTeacherActivityHandler,
} from "./functions/activities/getTeacherActivity";

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

export const listActivityAttempts = onCall(
    {
        cors: ["http://localhost:5173"],
    },
    async (request) => {
        const data =
            request.data as {
                activityId?: unknown;
            };

        return listActivityAttemptsHandler(
            typeof data?.activityId === "string"
                ? data.activityId
                : "",
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
        return awardXPHandler(
            request.data,
        );
    },
);

export const awardCoins = onCall(
    {
        cors: ["http://localhost:5173"],
    },
    async (request) => {
        return awardCoinsHandler(
            request.data,
        );
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

export const claimDailyChallenge = onCall(
    {
        cors: ["http://localhost:5173"],
    },
    async (request) => {
        return claimDailyChallengeHandler(
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
        return unlockAchievementHandler(
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
// SESSIONS
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
// SYNC
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

export const updateActivity = onCall(
    {
        cors: ["http://localhost:5173"],
    },
    async (request) => {
        return updateActivityHandler(
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
        const data =
            request.data as {
                activityId?: unknown;
            };

        return getActivityForAttempt(
            typeof data?.activityId === "string"
                ? data.activityId
                : "",
        ).then(
            (result) => ({
                activity:
                    result.activity,

                config:
                    result.config,
            }),
        );
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

export const listTeacherActivities = onCall(
    {
        cors: ["http://localhost:5173"],
    },
    async (request) => {
        return listTeacherActivitiesHandler(
            request.auth
                ? {
                    uid: request.auth.uid,
                }
                : null,
        );
    },
);

export const getTeacherActivity = onCall(
    {
        cors: ["http://localhost:5173"],
    },
    async (request) => {
        const data =
            request.data as {
                activityId?: unknown;
            };

        return getTeacherActivityHandler(
            typeof data?.activityId === "string"
                ? data.activityId
                : "",
            request.auth
                ? {
                    uid: request.auth.uid,
                }
                : null,
        );
    },
);

import {
    beforeAll,
    afterAll,
    describe,
    expect,
    it,
} from 'vitest';

import {
    getApps,
    initializeApp,
} from 'firebase-admin/app';

import {
    getFirestore,
} from 'firebase-admin/firestore';

import {
    initializeTestEnvironment,
    type RulesTestEnvironment,
} from '@firebase/rules-unit-testing';

import {
    removeFamilyMemberHandler,
} from '../src/functions/families/removeFamilyMember';

process.env.FIRESTORE_EMULATOR_HOST ??=
    '127.0.0.1:8081';

const projectId =
    process.env.GCLOUD_PROJECT
    ?? 'eduplay-test';

if (getApps().length === 0) {
    initializeApp({
        projectId,
    });
}

describe(
    'removeFamilyMemberHandler - integración',
    () => {
        let testEnvironment:
            RulesTestEnvironment;

        const familyId =
            'family-remove-member-integration';

        const memberId =
            'family-remove-member-integration-child';

        const ownerUserId =
            'parent-remove-member-integration';

        const childUserId =
            'student-remove-member-integration';

        beforeAll(
            async () => {
                testEnvironment =
                    await initializeTestEnvironment(
                        {
                            projectId:
                                'eduplay-test',

                            firestore: {
                                host:
                                    '127.0.0.1',

                                port:
                                    8081,
                            },
                        },
                    );

                const db =
                    getFirestore();

                await db
                    .collection(
                        'families',
                    )
                    .doc(
                        familyId,
                    )
                    .set({
                        name:
                            'Familia integración',

                        ownerUserId,

                        createdAt:
                            new Date(),

                        updatedAt:
                            new Date(),
                    });

                await db
                    .collection(
                        'familyMembers',
                    )
                    .doc(
                        memberId,
                    )
                    .set({
                        familyId,

                        userId:
                            childUserId,

                        role:
                            'child',

                        status:
                            'active',

                        createdAt:
                            new Date(),

                        updatedAt:
                            new Date(),
                    });
            },
        );

        afterAll(
            async () => {
                if (!testEnvironment) {
                    return;
                }

                await testEnvironment.cleanup();
            },
        );

        it(
            'elimina el miembro de Firestore',
            async () => {
                const result =
                    await removeFamilyMemberHandler(
                        {
                            memberId,
                        },
                        {
                            uid:
                                ownerUserId,
                        },
                    );

                expect(
                    result,
                ).toEqual({
                    success: true,

                    memberId,

                    familyId,

                    userId:
                        childUserId,
                });

                const db =
                    getFirestore();

                const memberSnapshot =
                    await db
                        .collection(
                            'familyMembers',
                        )
                        .doc(
                            memberId,
                        )
                        .get();

                expect(
                    memberSnapshot.exists,
                ).toBe(false);
            },
        );
    },
);
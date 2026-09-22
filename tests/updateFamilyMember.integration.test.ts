import {
    beforeAll,
    afterAll,
    describe,
    expect,
    it,
} from 'vitest';

import {
    initializeTestEnvironment,
    type RulesTestEnvironment,
} from '@firebase/rules-unit-testing';

import {
    getFirestore,
} from 'firebase-admin/firestore';

import {
    doc,
    getDoc,
} from 'firebase/firestore';

import {
    updateFamilyMemberHandler,
} from '../src/functions/families/updateFamilyMember';

describe(
    'updateFamilyMemberHandler - integración',
    () => {
        let testEnvironment:
            RulesTestEnvironment;

        const familyId =
            'family-update-member-integration';

        const memberId =
            'family-update-member-integration-child';

        const ownerUserId =
            'parent-update-member-integration';

        const childUserId =
            'student-update-member-integration';

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
            'actualiza el estado del miembro en Firestore',
            async () => {
                const result =
                    await updateFamilyMemberHandler(
                        {
                            memberId,

                            status:
                                'inactive',
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

                    status:
                        'inactive',
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
                ).toBe(true);

                expect(
                    memberSnapshot.data()
                        ?.status,
                ).toBe('inactive');
            },
        );
    },
);
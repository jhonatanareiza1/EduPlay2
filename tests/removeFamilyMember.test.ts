import {
    beforeEach,
    describe,
    expect,
    it,
} from 'vitest';

import {
    initializeTestEnvironment,
    type RulesTestEnvironment,
} from '@firebase/rules-unit-testing';

import {
    doc,
    setDoc,
} from 'firebase/firestore';

import {
    getFirestore,
} from 'firebase-admin/firestore';

import {
    removeFamilyMemberHandler,
} from '../src/functions/families/removeFamilyMember';

describe(
    'removeFamilyMemberHandler',
    () => {
        let testEnvironment:
            RulesTestEnvironment;

        const familyId =
            'family-remove-member-test';

        const memberId =
            'family-remove-member-test-child';

        const ownerUserId =
            'parent-remove-member-test';

        const childUserId =
            'student-remove-member-test';

        beforeEach(
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
                            'Familia test',

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

        it(
            'rechaza si no hay autenticación',
            async () => {
                await expect(
                    removeFamilyMemberHandler(
                        {
                            memberId,
                        },
                        null,
                    ),
                ).rejects.toMatchObject({
                    code:
                        'unauthenticated',
                });
            },
        );

        it(
            'rechaza si memberId está vacío',
            async () => {
                await expect(
                    removeFamilyMemberHandler(
                        {
                            memberId:
                                '',
                        },
                        {
                            uid:
                                ownerUserId,
                        },
                    ),
                ).rejects.toMatchObject({
                    code:
                        'invalid-argument',
                });
            },
        );

        it(
            'rechaza si el miembro no existe',
            async () => {
                await expect(
                    removeFamilyMemberHandler(
                        {
                            memberId:
                                'member-inexistente',
                        },
                        {
                            uid:
                                ownerUserId,
                        },
                    ),
                ).rejects.toMatchObject({
                    code:
                        'not-found',
                });
            },
        );

        it(
            'rechaza si la familia no existe',
            async () => {
                const db =
                    getFirestore();

                await db
                    .collection(
                        'familyMembers',
                    )
                    .doc(
                        memberId,
                    )
                    .set({
                        familyId:
                            'family-inexistente',

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

                await expect(
                    removeFamilyMemberHandler(
                        {
                            memberId,
                        },
                        {
                            uid:
                                ownerUserId,
                        },
                    ),
                ).rejects.toMatchObject({
                    code:
                        'not-found',
                });
            },
        );

        it(
            'rechaza si quien elimina no es el propietario',
            async () => {
                await expect(
                    removeFamilyMemberHandler(
                        {
                            memberId,
                        },
                        {
                            uid:
                                'parent-otro',
                        },
                    ),
                ).rejects.toMatchObject({
                    code:
                        'permission-denied',
                });
            },
        );

        it(
            'rechaza si el miembro no tiene una familia válida',
            async () => {
                const db =
                    getFirestore();

                await db
                    .collection(
                        'familyMembers',
                    )
                    .doc(
                        memberId,
                    )
                    .set({
                        familyId:
                            '',

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

                await expect(
                    removeFamilyMemberHandler(
                        {
                            memberId,
                        },
                        {
                            uid:
                                ownerUserId,
                        },
                    ),
                ).rejects.toMatchObject({
                    code:
                        'failed-precondition',
                });
            },
        );

        it(
            'elimina el miembro si lo hace el propietario',
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
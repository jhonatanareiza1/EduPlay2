import {
    afterAll,
    beforeAll,
    describe,
    expect,
    it,
} from "vitest";

import {
    getFirestore,
} from "firebase-admin/firestore";

import {
    updateFamilyMemberHandler,
} from "../src/functions/families/updateFamilyMember";

describe(
    "updateFamilyMemberHandler integration",
    () => {
        beforeAll(
            async () => {
                const db =
                    getFirestore();

                await db
                    .collection("families")
                    .doc("family-update-member-001")
                    .set({
                        name:
                            "Familia Update Member",
                        ownerUserId:
                            "parent-update-001",
                    });

                await db
                    .collection("familyMembers")
                    .doc(
                        "family-update-member-001_student-001",
                    )
                    .set({
                        familyId:
                            "family-update-member-001",
                        userId:
                            "student-update-001",
                        role:
                            "child",
                        status:
                            "active",
                    });
            },
        );

        afterAll(
            async () => {
                const db =
                    getFirestore();

                await db
                    .collection("familyMembers")
                    .doc(
                        "family-update-member-001_student-001",
                    )
                    .delete();

                await db
                    .collection("families")
                    .doc(
                        "family-update-member-001",
                    )
                    .delete();
            },
        );

        it(
            "actualiza el estado del miembro en Firestore Emulator",
            async () => {
                const result =
                    await updateFamilyMemberHandler(
                        {
                            memberId:
                                "family-update-member-001_student-001",
                            status:
                                "inactive",
                        },
                        {
                            uid:
                                "parent-update-001",
                        },
                    );

                expect(result).toMatchObject({
                    success:
                        true,
                    memberId:
                        "family-update-member-001_student-001",
                    familyId:
                        "family-update-member-001",
                    userId:
                        "student-update-001",
                    status:
                        "inactive",
                });

                const db =
                    getFirestore();

                const snapshot =
                    await db
                        .collection("familyMembers")
                        .doc(
                            "family-update-member-001_student-001",
                        )
                        .get();

                expect(
                    snapshot.data()?.status,
                ).toBe(
                    "inactive",
                );
            },
        );
    },
);
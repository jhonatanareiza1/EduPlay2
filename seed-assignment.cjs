const {
    initializeApp,
    getApps,
} = require("firebase-admin/app");

const {
    getFirestore,
    Timestamp,
} = require("firebase-admin/firestore");

process.env.FIRESTORE_EMULATOR_HOST ??=
    "127.0.0.1:8081";

const projectId =
    process.env.GCLOUD_PROJECT ??
    "eduplay-3db71";

if (getApps().length === 0) {
    initializeApp({
        projectId,
    });
}

const database =
    getFirestore();

const teacherId =
    "4p9bXi3MEIRCxlWZioi5jPt5GiZF";

const studentId =
    "6qrLCwQ8BRVFFKh4fRtlr5XbWKtu";

const activityId =
    "activity-test-001";

const assignmentId =
    "assignment-test-001";

async function seedAssignment() {
    const teacherReference =
        database
            .collection("users")
            .doc(teacherId);

    const studentUserReference =
        database
            .collection("users")
            .doc(studentId);

    const studentReference =
        database
            .collection("students")
            .doc(studentId);

    const activityReference =
        database
            .collection("activities")
            .doc(activityId);

    const [
        teacherSnapshot,
        studentUserSnapshot,
        studentSnapshot,
        activitySnapshot,
    ] =
        await Promise.all([
            teacherReference.get(),
            studentUserReference.get(),
            studentReference.get(),
            activityReference.get(),
        ]);

    if (!teacherSnapshot.exists) {
        throw new Error(
            `No existe el docente ${teacherId}.`,
        );
    }

    const teacherData =
        teacherSnapshot.data();

    if (
        teacherData?.role !==
        "teacher"
    ) {
        throw new Error(
            `El usuario ${teacherId} no tiene rol teacher.`,
        );
    }

    if (!studentUserSnapshot.exists) {
        throw new Error(
            `No existe el usuario estudiante ${studentId}.`,
        );
    }

    if (!activitySnapshot.exists) {
        throw new Error(
            `No existe la actividad ${activityId}.`,
        );
    }

    if (!studentSnapshot.exists) {
        const now =
            Timestamp.now();

        const studentUserData =
            studentUserSnapshot.data();

        await studentReference.set({
            uid:
                studentId,

            displayName:
                studentUserData?.displayName ??
                "Silvio Ramirez",

            createdAt:
                studentUserData?.createdAt ??
                now,

            updatedAt:
                now,
        });

        console.log(
            `Documento students/${studentId} creado.`,
        );
    } else {
        console.log(
            `El documento students/${studentId} ya existe.`,
        );
    }

    const assignmentReference =
        database
            .collection("activityAssignments")
            .doc(assignmentId);

    const existingSnapshot =
        await assignmentReference.get();

    if (existingSnapshot.exists) {
        console.log(
            `La asignación ${assignmentId} ya existe.`,
        );
        return;
    }

    const now =
        new Date();

    const dueAt =
        new Date(
            now.getTime() +
                24 *
                    60 *
                    60 *
                    1000,
        );

    await assignmentReference.set({
        activityId,

        assignedBy:
            teacherId,

        targetType:
            "student",

        targetId:
            studentId,

        dueAt:
            Timestamp.fromDate(
                dueAt,
            ),

        status:
            "assigned",

        createdAt:
            Timestamp.fromDate(
                now,
            ),
    });

    console.log(
        "Asignación creada correctamente.",
    );

    console.log({
        assignmentId,
        activityId,
        assignedBy:
            teacherId,
        targetType:
            "student",
        targetId:
            studentId,
        status:
            "assigned",
        dueAt:
            dueAt.toISOString(),
    });
}

seedAssignment()
    .then(() => {
        process.exit(0);
    })
    .catch((error) => {
        console.error(
            "Error creando la asignación:",
            error,
        );

        process.exit(1);
    });
const { initializeApp } = require("firebase-admin/app");
const { getFirestore } = require("firebase-admin/firestore");

process.env.FIRESTORE_EMULATOR_HOST = "127.0.0.1:8081";

initializeApp({
    projectId: "eduplay-3db71",
});

const db = getFirestore();

async function seed() {
    await db
        .collection("activities")
        .doc("activity-test-001")
        .set({
            title: "Actividad de prueba",
            description: "Descripción de prueba",
            ownerTeacherId: "teacher-test-001",
            configId: "config-test-001",
            type: "quiz",
            isPublished: true,
        });

    await db
        .collection("activityConfigs")
        .doc("config-test-001")
        .set({
            activityId: "activity-test-001",
            ownerTeacherId: "teacher-test-001",
            questions: [
                {
                    id: "question1",
                    type: "multiple-choice",
                    text: "Pregunta 1",
                    options: [
                        {
                            id: "option-a",
                            text: "Correcta",
                        },
                        {
                            id: "option-b",
                            text: "Incorrecta",
                        },
                    ],
                    points: 5,
                },
                {
                    id: "question2",
                    type: "multiple-choice",
                    text: "Pregunta 2",
                    options: [
                        {
                            id: "option-a",
                            text: "Incorrecta",
                        },
                        {
                            id: "option-b",
                            text: "Correcta",
                        },
                    ],
                    points: 5,
                },
            ],
            passingScore: 6,
        });

    await db
        .collection("activityAnswerKeys")
        .doc("activity-test-001")
        .set({
            activityId: "activity-test-001",
            ownerTeacherId: "teacher-test-001",
            answers: {
                question1: "option-a",
                question2: "option-b",
            },
        });

    console.log("Actividad creada correctamente.");
    console.log("activity-test-001");
}

seed()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });

require('dotenv').config({ path: '.env.local' });
const { v2 } = require('@google-cloud/translate');

async function testTranslation() {
    console.log("ProjectId:", process.env.FIREBASE_PROJECT_ID);
    console.log("Client Email:", process.env.FIREBASE_CLIENT_EMAIL);
    console.log("PrivateKey format:", process.env.FIREBASE_PRIVATE_KEY ? process.env.FIREBASE_PRIVATE_KEY.substring(0, 30) + "..." : "missing");

    const translateClient = new v2.Translate({
        projectId: process.env.FIREBASE_PROJECT_ID,
        credentials: {
            client_email: process.env.FIREBASE_CLIENT_EMAIL,
            private_key: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
        },
    });

    try {
        console.log("Testing translation...");
        const [translated] = await translateClient.translate("Hello world", {
            from: "en",
            to: "es",
        });
        console.log("Translated:", translated);
    } catch (err) {
        console.error("Translation fail:", err);
    }
}

testTranslation();

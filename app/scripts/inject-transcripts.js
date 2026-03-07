const admin = require('firebase-admin');

const serviceAccount = require('/Users/jadonjackson/Downloads/captionkit-f51d7-firebase-adminsdk-fbsvc-041e1d36a7.json');

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
}

const db = admin.firestore();

async function injectDummyTranscripts() {
    try {
        const sessionsRef = db.collection('sessions');
        const snapshot = await sessionsRef.where('status', '==', 'completed').limit(1).get();

        if (snapshot.empty) {
            console.log("No completed sessions found.");
            return;
        }

        const session = snapshot.docs[0];
        const sessionId = session.id;
        console.log(`Found completed session: ${sessionId} (${session.data().name})`);

        const transcriptsRef = db.collection(`sessions/${sessionId}/transcripts`);

        // delete existing just in case
        const existing = await transcriptsRef.get();
        const batch = db.batch();
        existing.forEach(doc => {
            batch.delete(doc.ref);
        });
        await batch.commit();

        const now = Date.now();

        await transcriptsRef.add({
            sessionId,
            text: "Hello, this is a historical test.",
            translations: { es: "Hola, esta es una prueba histórica.", fr: "Bonjour, c'est un test historique." },
            timestamp: now - 10000
        });

        await transcriptsRef.add({
            sessionId,
            text: "And this is the second line.",
            translations: { es: "Y esta es la segunda línea.", fr: "Et c'est la deuxième ligne." },
            timestamp: now - 5000
        });

        console.log(`Successfully injected 2 transcript lines into session ${sessionId}`);
        process.exit(0);
    } catch (e) {
        console.error("Error:", e);
        process.exit(1);
    }
}

injectDummyTranscripts();

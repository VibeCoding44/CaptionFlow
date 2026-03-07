const admin = require('firebase-admin');
const sa = require('/Users/jadonjackson/Downloads/captionkit-f51d7-firebase-adminsdk-fbsvc-041e1d36a7.json');
if (!admin.apps.length) admin.initializeApp({ credential: admin.credential.cert(sa) });
const db = admin.firestore();

(async () => {
    const sessions = await db.collection('sessions').get();
    console.log('Total sessions:', sessions.size);
    for (const s of sessions.docs) {
        const d = s.data();
        console.log('  Session:', s.id, '| name:', d.name, '| status:', d.status);
        const t = await db.collection('sessions/' + s.id + '/transcripts').get();
        console.log('    Transcripts count:', t.size);
        t.forEach(doc => {
            const td = doc.data();
            console.log('      Text:', (td.text || '').substring(0, 60), '| translations:', JSON.stringify(td.translations || {}));
        });
    }
    process.exit(0);
})().catch(e => { console.error('ERROR:', e.message); process.exit(1); });

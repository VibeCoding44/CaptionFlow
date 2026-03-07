import { collection, doc, setDoc, getDocs, getDoc, updateDoc, deleteDoc, query, where, orderBy } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Session, SessionStatus } from "@/types";

export const sessionService = {
    // Get a single session by ID
    async getSession(sessionId: string): Promise<Session | null> {
        const docRef = doc(db, "sessions", sessionId);
        const docSnap = await getDoc(docRef);
        if (!docSnap.exists()) return null;
        return docSnap.data() as Session;
    },

    // Create a new session
    async createSession(
        organizationId: string,
        name: string,
        sourceLanguage: string,
        targetLanguages: string[],
        createdBy: string
    ): Promise<string> {
        // Generate a new document reference with an auto ID
        const sessionRef = doc(collection(db, "sessions"));

        const newSession: Session = {
            id: sessionRef.id,
            organizationId,
            name,
            status: "scheduled",
            startTime: null,
            endTime: null,
            sourceLanguage,
            targetLanguages,
            createdAt: Date.now(),
            createdBy,
        };

        await setDoc(sessionRef, newSession);
        return sessionRef.id;
    },

    // Get all sessions for an organization
    async getSessions(organizationId: string): Promise<Session[]> {
        const sessionsRef = collection(db, "sessions");
        const q = query(
            sessionsRef,
            where("organizationId", "==", organizationId)
        );

        const querySnapshot = await getDocs(q);
        const sessions: Session[] = [];
        querySnapshot.forEach((doc) => {
            sessions.push(doc.data() as Session);
        });

        // Sort locally to avoid needing a Firebase composite index
        return sessions.sort((a, b) => b.createdAt - a.createdAt);
    },

    // Update session status (e.g. from scheduled -> live -> completed)
    async updateSessionStatus(
        sessionId: string,
        status: SessionStatus,
        timeUpdates?: { startTime?: number, endTime?: number }
    ): Promise<void> {
        const sessionRef = doc(db, "sessions", sessionId);

        const updates: Partial<Session> & { status: SessionStatus } = { status };
        if (timeUpdates?.startTime !== undefined) updates.startTime = timeUpdates.startTime;
        if (timeUpdates?.endTime !== undefined) updates.endTime = timeUpdates.endTime;

        await updateDoc(sessionRef, updates);
    },

    // Delete a session and its transcripts
    async deleteSession(sessionId: string): Promise<void> {
        // Delete all transcript documents in the subcollection first
        const transcriptsRef = collection(db, `sessions/${sessionId}/transcripts`);
        const snapshot = await getDocs(transcriptsRef);

        // Delete documents in batches (client-side simple loop for now)
        const deletePromises = snapshot.docs.map(docSnap => deleteDoc(docSnap.ref));
        await Promise.all(deletePromises);

        // Delete the session document
        const sessionRef = doc(db, "sessions", sessionId);
        await deleteDoc(sessionRef);
    },

    // Save a transcript line
    async saveTranscriptLine(sessionId: string, data: Omit<import('@/types').TranscriptLine, 'sessionId' | 'id'>): Promise<string> {
        const transcriptRef = doc(collection(db, `sessions/${sessionId}/transcripts`));
        const transcript = {
            id: transcriptRef.id,
            sessionId,
            ...data
        };
        await setDoc(transcriptRef, transcript);
        return transcriptRef.id;
    },

    // Get historical transcripts for a session
    async getTranscripts(sessionId: string): Promise<import('@/types').TranscriptLine[]> {
        const transcriptsRef = collection(db, `sessions/${sessionId}/transcripts`);
        const snapshot = await getDocs(query(transcriptsRef));
        const transcripts: import('@/types').TranscriptLine[] = [];
        snapshot.forEach((docSnap) => {
            transcripts.push({ ...docSnap.data(), id: docSnap.id } as import('@/types').TranscriptLine);
        });
        // Sort locally to avoid needing a Firebase composite index
        return transcripts.sort((a, b) => a.timestamp - b.timestamp);
    }
};

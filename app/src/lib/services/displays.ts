import { db } from "../firebase";
import { collection, doc, setDoc, getDocs, getDoc, query, where, deleteDoc } from "firebase/firestore";
import { Display } from "@/types";

export const displayService = {
    // Get a single display by ID
    async getDisplay(displayId: string): Promise<Display | null> {
        const docRef = doc(db, "displays", displayId);
        const docSnap = await getDoc(docRef);
        if (!docSnap.exists()) return null;
        return docSnap.data() as Display;
    },

    // Get all displays for an organization
    async getDisplays(orgId: string): Promise<Display[]> {
        const q = query(collection(db, "displays"), where("organizationId", "==", orgId));
        const querySnapshot = await getDocs(q);
        const displays: Display[] = [];
        querySnapshot.forEach((doc) => {
            displays.push(doc.data() as Display);
        });
        return displays;
    },

    // Create a new display
    async createDisplay(data: Omit<Display, "id" | "createdAt">): Promise<string> {
        const displayRef = doc(collection(db, "displays"));
        const newDisplay: Display = {
            ...data,
            id: displayRef.id,
            createdAt: Date.now(),
        };
        await setDoc(displayRef, newDisplay);
        return displayRef.id;
    },

    // Delete a display
    async deleteDisplay(displayId: string): Promise<void> {
        await deleteDoc(doc(db, "displays", displayId));
    },
};

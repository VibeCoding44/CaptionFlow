import { db } from "../firebase";
import { collection, doc, setDoc, getDocs, getDoc, query, where, updateDoc } from "firebase/firestore";
import { OrganizationMember, TranscriptionSettings, User, Organization } from "@/types";

export const orgService = {
    // Get all members for an organization
    async getMembers(orgId: string): Promise<OrganizationMember[]> {
        const q = query(collection(db, "organizationMembers"), where("organizationId", "==", orgId));
        const querySnapshot = await getDocs(q);
        const members: OrganizationMember[] = [];

        // Fetch users concurrently
        const userPromises: Promise<void>[] = [];

        querySnapshot.forEach((docSnap) => {
            const memberData = docSnap.data() as OrganizationMember;
            members.push(memberData);

            // Start fetching user profile
            const userRef = doc(db, "users", memberData.userId);
            const promise = getDoc(userRef).then((userSnap) => {
                if (userSnap.exists()) {
                    memberData.user = userSnap.data() as User;
                }
            });
            userPromises.push(promise);
        });

        await Promise.all(userPromises);
        return members;
    },

    // Update organization name
    async updateOrganizationName(orgId: string, name: string): Promise<void> {
        const orgRef = doc(db, "organizations", orgId);
        await updateDoc(orgRef, { name });
    },

    // Update organization settings (default languages, etc.)
    async updateSettings(orgId: string, settings: {
        defaultSourceLanguage?: string;
        defaultTargetLanguages?: string[];
    }): Promise<void> {
        const orgRef = doc(db, "organizations", orgId);
        const updates: Record<string, string | string[]> = {};
        if (settings.defaultSourceLanguage !== undefined) {
            updates["settings.defaultSourceLanguage"] = settings.defaultSourceLanguage;
        }
        if (settings.defaultTargetLanguages !== undefined) {
            updates["settings.defaultTargetLanguages"] = settings.defaultTargetLanguages;
        }
        await updateDoc(orgRef, updates);
    },

    // Update transcription settings (keywords, profanity filter, punctuation)
    async updateTranscriptionSettings(orgId: string, transcriptionSettings: TranscriptionSettings): Promise<void> {
        const orgRef = doc(db, "organizations", orgId);
        await updateDoc(orgRef, { transcriptionSettings });
    },

    // Get Organization by slug
    async getOrganizationBySlug(slug: string): Promise<Organization | null> {
        const q = query(collection(db, "organizations"), where("slug", "==", slug));
        const querySnapshot = await getDocs(q);
        if (querySnapshot.empty) {
            return null;
        }
        return querySnapshot.docs[0].data() as Organization;
    },

    // Invite user (mock: we just create a member doc if the user exists or not, but typically you'd send an email. For now, we'll just return a success)
    async inviteMember(orgId: string, email: string, role: "owner" | "admin" | "operator"): Promise<void> {
        const tempId = `inv_${Date.now()}`;
        const newMember: OrganizationMember = {
            id: tempId,
            userId: "pending_invite",
            organizationId: orgId,
            role,
            joinedAt: Date.now()
        };

        const docRef = doc(db, "organizationMembers", tempId);
        await setDoc(docRef, newMember);
    },

    // Create a new organization
    async createOrganization(name: string, userId: string): Promise<string> {
        // We use a generated ID from Firestore, but since we are doing it client side for now we can just use doc() with no path or Date.now()
        // Since we don't have a direct addDoc without importing, let's just generate a strong ID
        const orgId = `org_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

        // Generate a base slug from the name
        let baseSlug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
        if (!baseSlug) baseSlug = 'org'; // fallback

        // Use our API endpoint to ensure uniqueness securely
        const response = await fetch(`/api/organizations/check-slug?slug=${encodeURIComponent(baseSlug)}&orgId=${encodeURIComponent(orgId)}`);
        if (!response.ok) {
            throw new Error("Failed to secure unique slug during creation");
        }
        const data = await response.json();
        const slug = data.uniqueSlug;

        const orgRef = doc(db, "organizations", orgId);
        await setDoc(orgRef, {
            id: orgId,
            name,
            slug,
            createdAt: Date.now(),
            settings: {
                defaultSourceLanguage: "en",
                defaultTargetLanguages: ["es"],
            },
        });

        // Add user as owner
        const memberId = `${orgId}_${userId}`;
        const memberRef = doc(db, "organizationMembers", memberId);
        await setDoc(memberRef, {
            id: memberId,
            userId: userId,
            organizationId: orgId,
            role: "owner",
            joinedAt: Date.now(),
        });

        return orgId;
    },

    // Generate an invite code for an organization
    async generateInviteCode(orgId: string, role: "admin" | "operator" | "viewer", createdByUserId: string): Promise<string> {
        const code = Math.random().toString(36).substring(2, 10).toUpperCase(); // 8 char code

        const inviteRef = doc(db, "organizationInvites", code);
        await setDoc(inviteRef, {
            code,
            organizationId: orgId,
            role,
            createdBy: createdByUserId,
            createdAt: Date.now(),
            expiresAt: Date.now() + (7 * 24 * 60 * 60 * 1000) // 7 days expiration
        });

        return code;
    },

    // Join an organization using an invite code
    async joinWithInviteCode(code: string, userId: string): Promise<string> {
        const inviteRef = doc(db, "organizationInvites", code);
        const inviteSnap = await getDocs(query(collection(db, "organizationInvites"), where("code", "==", code)));

        if (inviteSnap.empty) {
            throw new Error("Invalid or expired invite code");
        }

        const inviteData = inviteSnap.docs[0].data();

        if (inviteData.expiresAt < Date.now()) {
            throw new Error("This invite code has expired");
        }

        // Check if user is already a member
        const membersRef = collection(db, "organizationMembers");
        const q = query(membersRef, where("userId", "==", userId), where("organizationId", "==", inviteData.organizationId));
        const memberSnap = await getDocs(q);

        if (!memberSnap.empty) {
            return inviteData.organizationId; // Already a member, just return orgId to redirect
        }

        // Add the user as a member
        const mappingId = `${inviteData.organizationId}_${userId}`;
        const memberDocRef = doc(db, "organizationMembers", mappingId);
        await setDoc(memberDocRef, {
            id: mappingId,
            userId: userId,
            organizationId: inviteData.organizationId,
            role: inviteData.role,
            joinedAt: Date.now()
        });

        return inviteData.organizationId;
    }
};

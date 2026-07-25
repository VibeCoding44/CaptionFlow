"use client";

import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { useAuth } from "./AuthContext";
import { Organization, OrganizationMember } from "@/types";

interface OrganizationContextType {
    organizations: Organization[]; // All orgs they belong to
    currentOrganization: Organization | null;
    currentMemberRole: string | null;
    loadingOrganization: boolean;
    refreshOrganization: () => Promise<void>;
    switchOrganization: (orgId: string) => void;
}

const OrganizationContext = createContext<OrganizationContextType | undefined>(undefined);

export function OrganizationProvider({ children }: { children: React.ReactNode }) {
    const { user, loading: authLoading } = useAuth();
    const [organizations, setOrganizations] = useState<Organization[]>([]);
    const [currentOrganization, setCurrentOrganization] = useState<Organization | null>(null);
    const [currentMemberRole, setCurrentMemberRole] = useState<string | null>(null);
    const [loadingOrganization, setLoadingOrganization] = useState(true);

    const fetchUserOrganization = useCallback(async () => {
        if (!user) {
            setOrganizations([]);
            setCurrentOrganization(null);
            setCurrentMemberRole(null);
            setLoadingOrganization(false);
            return;
        }

        try {
            const { collection, query, where, getDocs, doc, getDoc } = await import("firebase/firestore");
            const { db } = await import("@/lib/firebase");

            const membersRef = collection(db, "organizationMembers");
            const q = query(membersRef, where("userId", "==", user.uid));
            const querySnapshot = await getDocs(q);

            if (!querySnapshot.empty) {
                const memberOrgs = querySnapshot.docs.map(d => d.data() as OrganizationMember);

                const fetchedOrgs: Organization[] = [];
                for (const member of memberOrgs) {
                    const orgRef = doc(db, "organizations", member.organizationId);
                    const orgSnap = await getDoc(orgRef);
                    if (orgSnap.exists()) {
                        fetchedOrgs.push(orgSnap.data() as Organization);
                    }
                }

                setOrganizations(fetchedOrgs);

                if (fetchedOrgs.length > 0) {
                    const savedOrgId = localStorage.getItem("captionkit_org_id");
                    let activeOrg = fetchedOrgs.find(org => org.id === savedOrgId);

                    if (!activeOrg) {
                        activeOrg = fetchedOrgs[0];
                        localStorage.setItem("captionkit_org_id", activeOrg.id);
                    }

                    setCurrentOrganization(activeOrg);

                    const roleMapping = memberOrgs.find(m => m.organizationId === activeOrg?.id);
                    setCurrentMemberRole(roleMapping?.role || null);
                } else {
                    setCurrentOrganization(null);
                    setCurrentMemberRole(null);
                }
            } else {
                setOrganizations([]);
                setCurrentOrganization(null);
                setCurrentMemberRole(null);
            }
        } catch (error) {
            console.error("Error fetching organization:", error);
        } finally {
            setLoadingOrganization(false);
        }
    }, [user]);

    useEffect(() => {
        if (!authLoading) {
            fetchUserOrganization();
        }
    }, [authLoading, fetchUserOrganization]);

    const refreshOrganization = useCallback(async () => {
        await fetchUserOrganization();
    }, [fetchUserOrganization]);

    const switchOrganization = useCallback((orgId: string) => {
        const org = organizations.find(o => o.id === orgId);
        if (org) {
            localStorage.setItem("captionkit_org_id", orgId);
            setCurrentOrganization(org);
            refreshOrganization();
        }
    }, [organizations, refreshOrganization]);

    return (
        <OrganizationContext.Provider value={{ organizations, currentOrganization, currentMemberRole, loadingOrganization, refreshOrganization, switchOrganization }}>
            {children}
        </OrganizationContext.Provider>
    );
}

export function useOrganization() {
    const context = useContext(OrganizationContext);
    if (context === undefined) {
        throw new Error("useOrganization must be used within an OrganizationProvider");
    }
    return context;
}

import { Metadata } from 'next';
import { adminDb } from '@/lib/firebase-admin';
import { Session, Organization } from '@/types';
import { notFound, redirect } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import RefreshRedirector from '@/components/session/RefreshRedirector';

export const metadata: Metadata = {
    title: 'Live Broadcast',
};

async function getLiveSession(organizationId: string): Promise<Session | null> {
    const snapshot = await adminDb.collection("sessions")
        .where("organizationId", "==", organizationId)
        .where("status", "==", "live")
        .get();

    if (snapshot.empty) return null;

    return { id: snapshot.docs[0].id, ...snapshot.docs[0].data() } as Session;
}

export default async function LivePage({ params }: { params: Promise<{ slug: string }> }) {
    const slug = (await params).slug;

    // Look up the organization by slug via admin SDK
    const orgSnapshot = await adminDb.collection("organizations")
        .where("slug", "==", slug)
        .get();

    if (orgSnapshot.empty) {
        notFound();
    }

    const organization = { id: orgSnapshot.docs[0].id, ...orgSnapshot.docs[0].data() } as Organization;

    // Look for an active live session for this organization
    const liveSession = await getLiveSession(organization.id);

    if (liveSession) {
        // Redirect the user directly into the active session
        redirect(`/join?session=${liveSession.id}`);
    }

    // No active session found. Show a branded waiting screen.
    return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-8 max-w-lg w-full text-center space-y-6">
                <div className="mx-auto w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mb-6">
                    <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
                </div>

                <h1 className="text-2xl font-semibold text-slate-900">
                    Waiting for broadcast...
                </h1>

                <p className="text-slate-500 text-lg">
                    {organization.name} is not currently broadcasting an active session.
                </p>

                <div className="h-px bg-slate-100 my-8 w-full"></div>

                <p className="text-sm text-slate-400">
                    This page will automatically redirect you once the broadcast begins.
                </p>
                <RefreshRedirector intervalMs={3000} />
            </div>
        </div>
    );
}

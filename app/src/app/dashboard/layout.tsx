"use client";

import { Sidebar } from "@/components/layout/Sidebar";
import { useAuth } from "@/context/AuthContext";
import { OrganizationProvider } from "@/context/OrganizationContext";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from "@/components/ui/sheet";
import { Menu, Captions } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const { user, loading } = useAuth();
    const router = useRouter();

    useEffect(() => {
        if (!loading && !user) {
            router.push("/login");
        }
    }, [user, loading, router]);

    if (loading) {
        return (
            <div className="flex items-center justify-center h-screen bg-zinc-950">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-10 h-10 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                    <p className="text-sm text-zinc-400">Loading...</p>
                </div>
            </div>
        );
    }

    if (!user) return null;

    return (
        <OrganizationProvider>
            <DashboardContent>{children}</DashboardContent>
        </OrganizationProvider>
    );
}

import { OrganizationOnboarding } from "@/components/organization/OrganizationOnboarding";
import { useOrganization } from "@/context/OrganizationContext";

function DashboardContent({ children }: { children: React.ReactNode }) {
    const { organizations, loadingOrganization, refreshOrganization } = useOrganization();

    if (loadingOrganization) {
        return (
            <div className="flex items-center justify-center h-screen bg-zinc-950">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-10 h-10 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                    <p className="text-sm text-zinc-400">Loading Workspace...</p>
                </div>
            </div>
        );
    }

    if (organizations.length === 0) {
        return (
            <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center p-4">
                <OrganizationOnboarding onComplete={refreshOrganization} />
            </div>
        );
    }

    return (
        <div className="flex flex-col md:flex-row h-screen bg-zinc-950">
            {/* Mobile Header */}
            <header className="flex md:hidden items-center justify-between p-4 border-b border-zinc-800/60 bg-zinc-950 shrink-0">
                <div className="flex items-center gap-2">
                    <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-violet-600">
                        <Captions className="w-4 h-4 text-white" />
                    </div>
                    <span className="font-semibold text-white tracking-tight">CaptionFlow</span>
                </div>
                <Sheet>
                    <SheetTrigger asChild>
                        <Button variant="ghost" size="icon" className="text-zinc-400">
                            <Menu className="w-6 h-6" />
                        </Button>
                    </SheetTrigger>
                    <SheetContent side="left" className="p-0 w-[260px] border-zinc-800/60 bg-zinc-950">
                        <SheetTitle className="sr-only">Navigation Menu</SheetTitle>
                        <Sidebar isMobile />
                    </SheetContent>
                </Sheet>
            </header>

            <div className="hidden md:flex">
                <Sidebar />
            </div>

            <main className="flex-1 overflow-y-auto">
                <div className="p-4 md:p-6 lg:p-8">{children}</div>
            </main>
        </div>
    );
}

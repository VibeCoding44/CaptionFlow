"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
    Mic,
    Languages,
    Clock,
    Users,
    Plus,
    ArrowRight,
    Radio,
    MonitorPlay,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useOrganization } from "@/context/OrganizationContext";
import { Session } from "@/types";
import { formatDistanceToNow } from "date-fns";

// Mock data for initial dashboard before load
const initialStats = [
    {
        label: "Total Sessions",
        value: "-",
        icon: Mic,
        color: "from-blue-500 to-blue-600",
    },
    {
        label: "Active Displays",
        value: "0",
        icon: MonitorPlay,
        color: "from-amber-500 to-amber-600",
    },
    {
        label: "Languages Used",
        value: "0",
        icon: Languages,
        color: "from-emerald-500 to-emerald-600",
    },
    {
        label: "Hours Captioned",
        value: "0h",
        icon: Clock,
        color: "from-violet-500 to-violet-600",
    },
];

export default function DashboardPage() {
    const { currentOrganization } = useOrganization();
    const [recentSessions, setRecentSessions] = useState<Session[]>([]);
    const [stats, setStats] = useState(initialStats);
    const [activeSession, setActiveSession] = useState<Session | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function loadDashboardData() {
            if (!currentOrganization) {
                setLoading(false);
                return;
            }

            try {
                const { sessionService } = await import("@/lib/services/sessions");
                const sessions: Session[] = await sessionService.getSessions(currentOrganization.id);

                setRecentSessions(sessions.slice(0, 5));

                const active = sessions.find(s => s.status === "live");
                setActiveSession(active || null);

                const totalLangs = new Set<string>();
                sessions.forEach(s => {
                    totalLangs.add(s.sourceLanguage);
                    s.targetLanguages.forEach(l => totalLangs.add(l));
                });

                setStats([
                    {
                        label: "Total Sessions",
                        value: sessions.length.toString(),
                        icon: Mic,
                        color: "from-blue-500 to-blue-600",
                    },
                    {
                        label: "Active Displays",
                        value: "0",
                        icon: MonitorPlay,
                        color: "from-amber-500 to-amber-600",
                    },
                    {
                        label: "Languages Used",
                        value: totalLangs.size.toString(),
                        icon: Languages,
                        color: "from-emerald-500 to-emerald-600",
                    },
                    {
                        label: "Hours Captioned",
                        value: "0h",
                        icon: Clock,
                        color: "from-violet-500 to-violet-600",
                    },
                ]);
            } catch (error) {
                console.error("Error loading dashboard data:", error);
            } finally {
                setLoading(false);
            }
        }

        loadDashboardData();
    }, [currentOrganization]);

    return (
        <div className="space-y-8">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-white">Dashboard</h1>
                    <p className="text-zinc-400 mt-1">
                        Welcome to {currentOrganization?.name || "CaptionFlow"}. Start a session to begin live captioning.
                    </p>
                </div>
                <Button
                    asChild
                    className="bg-gradient-to-r from-blue-500 to-violet-600 hover:from-blue-600 hover:to-violet-700 text-white shadow-lg shadow-blue-500/20"
                >
                    <Link href="/dashboard/sessions/new">
                        <Plus className="w-4 h-4 mr-2" />
                        New Session
                    </Link>
                </Button>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {stats.map((stat) => (
                    <Card
                        key={stat.label}
                        className="bg-zinc-900/60 backdrop-blur-xl border-zinc-800/60 hover:border-zinc-700/60 transition-all duration-200"
                    >
                        <CardContent className="p-5">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-zinc-400">{stat.label}</p>
                                    <p className="text-3xl font-bold text-white mt-1">
                                        {stat.value}
                                    </p>
                                </div>
                                <div
                                    className={`flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-br ${stat.color} shadow-lg`}
                                >
                                    <stat.icon className="w-6 h-6 text-white" />
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            {/* Quick Actions + Active Session Preview */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Active Session */}
                <Card className="lg:col-span-2 bg-zinc-900/60 backdrop-blur-xl border-zinc-800/60">
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-lg font-semibold text-white">
                                Active Session
                            </h2>
                            <Badge
                                variant={activeSession ? "default" : "outline"}
                                className={activeSession ? "bg-red-500/10 text-red-500 border-red-500/20" : "border-zinc-700 text-zinc-400"}
                            >
                                {activeSession ? "Live Now" : "No active session"}
                            </Badge>
                        </div>
                        <div className="flex flex-col items-center justify-center py-12 text-center">
                            {activeSession ? (
                                <>
                                    <div className="w-16 h-16 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center mb-4 relative">
                                        <div className="absolute inset-0 rounded-2xl border border-red-500 animate-ping opacity-50"></div>
                                        <Mic className="w-8 h-8 text-red-500" />
                                    </div>
                                    <h3 className="text-xl font-bold text-white">
                                        {activeSession.name}
                                    </h3>
                                    <p className="text-zinc-400 mt-2">
                                        Live translating {activeSession.targetLanguages.length} languages
                                    </p>
                                    <Button
                                        asChild
                                        className="mt-6 bg-red-500 hover:bg-red-600 text-white"
                                    >
                                        <Link href={`/dashboard/sessions/${activeSession.id}/live`}>
                                            <Radio className="w-4 h-4 mr-2" />
                                            Go to Control Panel
                                        </Link>
                                    </Button>
                                </>
                            ) : (
                                <>
                                    <div className="w-16 h-16 rounded-2xl bg-zinc-800/50 border border-zinc-700/50 flex items-center justify-center mb-4">
                                        <Radio className="w-8 h-8 text-zinc-600" />
                                    </div>
                                    <h3 className="text-lg font-medium text-zinc-300">
                                        No session running
                                    </h3>
                                    <p className="text-sm text-zinc-500 mt-1 max-w-md">
                                        Start a new captioning session to see the live preview here.
                                        Captions will appear in real-time as you speak.
                                    </p>
                                    <Button
                                        asChild
                                        className="mt-6 bg-gradient-to-r from-blue-500 to-violet-600 hover:from-blue-600 hover:to-violet-700 text-white"
                                    >
                                        <Link href="/dashboard/sessions/new">
                                            <Mic className="w-4 h-4 mr-2" />
                                            Start Captioning
                                        </Link>
                                    </Button>
                                </>
                            )}
                        </div>
                    </CardContent>
                </Card>

                {/* Quick Actions */}
                <Card className="bg-zinc-900/60 backdrop-blur-xl border-zinc-800/60">
                    <CardContent className="p-6">
                        <h2 className="text-lg font-semibold text-white mb-4">
                            Quick Actions
                        </h2>
                        <div className="space-y-3">
                            {[
                                {
                                    label: "New Session",
                                    desc: "Start live captioning",
                                    href: "/dashboard/sessions/new",
                                    icon: Mic,
                                },
                                {
                                    label: "Manage Displays",
                                    desc: "Configure output screens",
                                    href: "/dashboard/displays",
                                    icon: MonitorPlay,
                                },
                                {
                                    label: "Invite Team",
                                    desc: "Add operators & admins",
                                    href: "/dashboard/team",
                                    icon: Users,
                                },
                            ].map((action) => (
                                <Link
                                    key={action.href}
                                    href={action.href}
                                    className="flex items-center gap-4 p-3 rounded-xl bg-zinc-800/30 hover:bg-zinc-800/60 border border-zinc-800/40 hover:border-zinc-700/60 transition-all duration-200 group"
                                >
                                    <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-zinc-800 border border-zinc-700/50">
                                        <action.icon className="w-5 h-5 text-zinc-400 group-hover:text-blue-400 transition-colors" />
                                    </div>
                                    <div className="flex-1">
                                        <p className="text-sm font-medium text-white">
                                            {action.label}
                                        </p>
                                        <p className="text-xs text-zinc-500">{action.desc}</p>
                                    </div>
                                    <ArrowRight className="w-4 h-4 text-zinc-600 group-hover:text-blue-400 transition-colors" />
                                </Link>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Recent Sessions Table */}
            <Card className="bg-zinc-900/60 backdrop-blur-xl border-zinc-800/60">
                <CardContent className="p-6">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-lg font-semibold text-white">
                            Recent Sessions
                        </h2>
                        <Button variant="ghost" asChild className="text-zinc-400 hover:text-white">
                            <Link href="/dashboard/sessions">
                                View all
                                <ArrowRight className="w-4 h-4 ml-1" />
                            </Link>
                        </Button>
                    </div>
                    <div className="py-4">
                        {loading ? (
                            <div className="flex justify-center py-8">
                                <div className="w-6 h-6 border-2 border-zinc-600 border-t-white rounded-full animate-spin" />
                            </div>
                        ) : recentSessions.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-8 text-center">
                                <p className="text-sm text-zinc-500">
                                    No sessions yet. Start your first captioning session to see history here.
                                </p>
                            </div>
                        ) : (
                            <div className="space-y-1">
                                {recentSessions.map((session) => (
                                    <Link
                                        key={session.id}
                                        href={`/dashboard/sessions/${session.id}/live`}
                                        className="flex items-center justify-between p-4 hover:bg-zinc-800/30 rounded-xl transition-colors border border-transparent hover:border-zinc-800/60"
                                    >
                                        <div className="flex items-center gap-4">
                                            <div className="w-10 h-10 rounded-full bg-zinc-800 flex items-center justify-center text-zinc-400">
                                                <Mic className="w-5 h-5" />
                                            </div>
                                            <div>
                                                <p className="text-sm font-medium text-white">{session.name}</p>
                                                <p className="text-xs text-zinc-500 flex items-center gap-2 mt-1">
                                                    <span>{session.sourceLanguage.toUpperCase()} → {session.targetLanguages.length} targets</span>
                                                    <span>•</span>
                                                    <span>{formatDistanceToNow(session.createdAt, { addSuffix: true })}</span>
                                                </p>
                                            </div>
                                        </div>
                                        <Badge variant={session.status === "live" ? "default" : "outline"} className={
                                            session.status === "live"
                                                ? "bg-red-500/10 text-red-500 hover:bg-red-500/20 border-red-500/20 animate-pulse"
                                                : "text-zinc-500 border-zinc-700"
                                        }>
                                            {session.status.toUpperCase()}
                                        </Badge>
                                    </Link>
                                ))}
                            </div>
                        )}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}

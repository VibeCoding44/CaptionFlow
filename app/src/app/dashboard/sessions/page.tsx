"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
    Mic,
    Search,
    Clock,
    Languages,
    Plus,
    Calendar,
    ArrowUpDown,
    MoreVertical,
    Trash2,
    ExternalLink,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useOrganization } from "@/context/OrganizationContext";
import { Session } from "@/types";
import { isDemo, DEMO_SESSIONS } from "@/lib/demo";
import { format, differenceInMinutes, formatDistanceToNow } from "date-fns";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";

export default function SessionsPage() {
    const { currentOrganization } = useOrganization();
    const [sessions, setSessions] = useState<Session[]>([]);
    const [loading, setLoading] = useState(true);
    const [deleteSessionId, setDeleteSessionId] = useState<string | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);

    useEffect(() => {
        async function loadSessions() {
            if (!currentOrganization) {
                setLoading(false);
                return;
            }
            try {
                let data: Session[];
                if (isDemo) {
                    data = DEMO_SESSIONS;
                } else {
                    const { sessionService } = await import("@/lib/services/sessions");
                    data = await sessionService.getSessions(currentOrganization.id);
                }
                setSessions(data);
            } catch (error) {
                console.error("Error loading sessions:", error);
            } finally {
                setLoading(false);
            }
        }

        loadSessions();
    }, [currentOrganization]);

    const getDuration = (session: Session) => {
        if (session.status === "live") {
            const start = session.startTime || session.createdAt;
            return `Live for ${formatDistanceToNow(start)}`;
        }

        if (session.startTime && session.endTime) {
            const mins = differenceInMinutes(session.endTime, session.startTime);
            if (mins < 60) return `${mins}m`;
            const hours = Math.floor(mins / 60);
            return `${hours}h ${mins % 60}m`;
        }

        return "Unknown";
    };

    const handleDeleteSession = async () => {
        if (!deleteSessionId) return;

        setIsDeleting(true);
        try {
            if (isDemo) {
                // In demo mode, just remove from local state
                setSessions((prev) => prev.filter((s) => s.id !== deleteSessionId));
            } else {
                const { sessionService } = await import("@/lib/services/sessions");
                await sessionService.deleteSession(deleteSessionId);
                setSessions((prev) => prev.filter((s) => s.id !== deleteSessionId));
            }
        } catch (error) {
            console.error("Error deleting session:", error);
            alert("Failed to delete session. Please check permissions and try again.");
        } finally {
            setIsDeleting(false);
            setDeleteSessionId(null);
        }
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-white">Sessions</h1>
                    <p className="text-zinc-400 mt-1">
                        View and manage all captioning sessions
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

            {/* Filters & Search */}
            <Card className="bg-zinc-900/60 backdrop-blur-xl border-zinc-800/60">
                <CardContent className="p-4">
                    <div className="flex items-center gap-4">
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                            <Input
                                placeholder="Search sessions..."
                                className="pl-10 bg-zinc-800/50 border-zinc-700/50 text-white placeholder:text-zinc-500"
                            />
                        </div>
                        <Button variant="outline" className="border-zinc-700/50 text-zinc-400 hover:text-white">
                            <Calendar className="w-4 h-4 mr-2" />
                            Date Range
                        </Button>
                        <Button variant="outline" className="border-zinc-700/50 text-zinc-400 hover:text-white">
                            <ArrowUpDown className="w-4 h-4 mr-2" />
                            Sort
                        </Button>
                    </div>
                </CardContent>
            </Card>

            {/* Sessions Table */}
            <Card className="bg-zinc-900/60 backdrop-blur-xl border-zinc-800/60">
                <CardContent className="p-0">
                    {loading ? (
                        <div className="flex justify-center items-center py-16">
                            <div className="w-8 h-8 border-2 border-zinc-600 border-t-white rounded-full animate-spin" />
                        </div>
                    ) : sessions.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-16 text-center">
                            <div className="w-16 h-16 rounded-2xl bg-zinc-800/50 border border-zinc-700/50 flex items-center justify-center mb-4">
                                <Mic className="w-8 h-8 text-zinc-600" />
                            </div>
                            <h3 className="text-lg font-medium text-zinc-300">
                                No sessions yet
                            </h3>
                            <p className="text-sm text-zinc-500 mt-1 max-w-md">
                                Start your first captioning session to see your session history
                                here.
                            </p>
                            <Button
                                asChild
                                className="mt-6 bg-gradient-to-r from-blue-500 to-violet-600 hover:from-blue-600 hover:to-violet-700 text-white"
                            >
                                <Link href="/dashboard/sessions/new">
                                    <Plus className="w-4 h-4 mr-2" />
                                    Start First Session
                                </Link>
                            </Button>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead>
                                    <tr className="border-b border-zinc-800/60">
                                        <th className="text-left px-6 py-3 text-xs font-medium text-zinc-500 uppercase tracking-wider">
                                            Session
                                        </th>
                                        <th className="text-left px-6 py-3 text-xs font-medium text-zinc-500 uppercase tracking-wider">
                                            Date
                                        </th>
                                        <th className="text-left px-6 py-3 text-xs font-medium text-zinc-500 uppercase tracking-wider">
                                            Duration
                                        </th>
                                        <th className="text-left px-6 py-3 text-xs font-medium text-zinc-500 uppercase tracking-wider">
                                            Languages
                                        </th>
                                        <th className="text-left px-6 py-3 text-xs font-medium text-zinc-500 uppercase tracking-wider">
                                            Status
                                        </th>
                                        <th className="px-6 py-3" />
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-zinc-800/40">
                                    {sessions.map((session) => (
                                        <tr
                                            key={session.id}
                                            className="hover:bg-zinc-800/30 transition-colors"
                                        >
                                            <td className="px-6 py-4">
                                                <p className="text-sm font-medium text-white line-clamp-1">
                                                    {session.name}
                                                </p>
                                            </td>
                                            <td className="px-6 py-4 text-sm text-zinc-400">
                                                {format(session.createdAt, "MMM d, yyyy")}
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-1.5 text-sm text-zinc-400">
                                                    <Clock className="w-3.5 h-3.5" />
                                                    {getDuration(session)}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-1.5 text-sm text-zinc-400">
                                                    <Languages className="w-3.5 h-3.5" />
                                                    {session.sourceLanguage.toUpperCase()} → {session.targetLanguages.length}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <Badge
                                                    variant={session.status === "live" ? "default" : "outline"}
                                                    className={
                                                        session.status === "live"
                                                            ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/20"
                                                            : "border-zinc-700 text-zinc-400"
                                                    }
                                                >
                                                    {session.status === "live" ? "● Live" : "Completed"}
                                                </Badge>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <DropdownMenu>
                                                    <DropdownMenuTrigger asChild>
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="text-zinc-500 hover:text-white"
                                                        >
                                                            <MoreVertical className="w-4 h-4" />
                                                        </Button>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent align="end" className="bg-zinc-900 border-zinc-800 text-zinc-300">
                                                        <DropdownMenuItem asChild className="focus:bg-zinc-800 focus:text-white cursor-pointer">
                                                            <Link href={`/dashboard/sessions/${session.id}/live`}>
                                                                <ExternalLink className="w-4 h-4 mr-2" />
                                                                View Session
                                                            </Link>
                                                        </DropdownMenuItem>
                                                        <DropdownMenuItem
                                                            className="text-red-400 focus:text-red-400 focus:bg-red-500/10 cursor-pointer"
                                                            onClick={() => setDeleteSessionId(session.id)}
                                                        >
                                                            <Trash2 className="w-4 h-4 mr-2" />
                                                            Delete Session
                                                        </DropdownMenuItem>
                                                    </DropdownMenuContent>
                                                </DropdownMenu>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Delete Confirmation Dialog */}
            <Dialog open={!!deleteSessionId} onOpenChange={(open) => !open && setDeleteSessionId(null)}>
                <DialogContent className="bg-zinc-900 border-zinc-800 text-zinc-300 sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle className="text-white">Delete Session</DialogTitle>
                        <DialogDescription className="text-zinc-400">
                            Are you sure you want to delete this session? This action cannot be undone and will permanently remove all associated transcripts.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter className="mt-6 flex gap-2">
                        <Button
                            variant="outline"
                            onClick={() => setDeleteSessionId(null)}
                            disabled={isDeleting}
                            className="bg-transparent border-zinc-700 hover:bg-zinc-800 text-white"
                        >
                            Cancel
                        </Button>
                        <Button
                            variant="destructive"
                            onClick={handleDeleteSession}
                            disabled={isDeleting}
                            className="bg-red-600 hover:bg-red-700 text-white"
                        >
                            {isDeleting ? "Deleting..." : "Delete Session"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}

"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
    Users,
    Search,
    UserPlus,
    MoreHorizontal,
    Shield,
    Copy,
    Check
} from "lucide-react";
import { useEffect, useState } from "react";
import { useOrganization } from "@/context/OrganizationContext";
import { orgService } from "@/lib/services/organization";
import { OrganizationMember } from "@/types";
import { formatDistanceToNow } from "date-fns";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";

export default function TeamPage() {
    const { currentOrganization, currentMemberRole: userRole } = useOrganization();
    const [members, setMembers] = useState<OrganizationMember[]>([]);
    const [loading, setLoading] = useState(true);
    const [inviteRole, setInviteRole] = useState<"admin" | "operator" | "viewer">("operator");
    const [generatedCode, setGeneratedCode] = useState<string | null>(null);
    const [copied, setCopied] = useState(false);
    const [inviting, setInviting] = useState(false);
    const { user } = useAuth();

    useEffect(() => {
        async function loadMembers() {
            if (!currentOrganization) {
                setLoading(false);
                return;
            }
            try {
                const data = await orgService.getMembers(currentOrganization.id);
                setMembers(data);
            } catch (error) {
                console.error("Error loading team members:", error);
            } finally {
                setLoading(false);
            }
        }

        loadMembers();
    }, [currentOrganization]);

    const handleGenerateInvite = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!currentOrganization || !user) return;

        setInviting(true);
        try {
            const code = await orgService.generateInviteCode(currentOrganization.id, inviteRole, user.uid);
            setGeneratedCode(code);
            toast.success("Invite code generated!");
        } catch (error) {
            console.error("Error generating invite:", error);
            toast.error("Failed to generate invite code.");
        } finally {
            setInviting(false);
        }
    };

    const copyToClipboard = () => {
        if (!generatedCode) return;
        const link = `${window.location.origin}/dashboard/organization/new?code=${generatedCode}`;
        navigator.clipboard.writeText(link);
        setCopied(true);
        toast.success("Invite link copied to clipboard!");
        setTimeout(() => setCopied(false), 2000);
    };

    const getRoleBadgeColor = (role: string) => {
        switch (role) {
            case "owner":
                return "bg-amber-500/15 text-amber-500 border-amber-500/20";
            case "admin":
                return "bg-blue-500/15 text-blue-400 border-blue-500/20";
            case "operator":
                return "bg-emerald-500/15 text-emerald-400 border-emerald-500/20";
            default:
                return "border-zinc-700 text-zinc-400";
        }
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-white">Team Management</h1>
                    <p className="text-zinc-400 mt-1">
                        Manage members and roles for {currentOrganization?.name || "your organization"}
                    </p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Main Team List */}
                <div className="lg:col-span-2 space-y-6">
                    {/* Filters & Search */}
                    <Card className="bg-zinc-900/60 backdrop-blur-xl border-zinc-800/60">
                        <CardContent className="p-4">
                            <div className="flex items-center gap-4">
                                <div className="relative flex-1">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                                    <Input
                                        placeholder="Search members..."
                                        className="pl-10 bg-zinc-800/50 border-zinc-700/50 text-white placeholder:text-zinc-500"
                                    />
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Members Table */}
                    <Card className="bg-zinc-900/60 backdrop-blur-xl border-zinc-800/60">
                        <CardContent className="p-0">
                            {loading ? (
                                <div className="flex justify-center items-center py-16">
                                    <div className="w-8 h-8 border-2 border-zinc-600 border-t-white rounded-full animate-spin" />
                                </div>
                            ) : members.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-16 text-center">
                                    <h3 className="text-lg font-medium text-zinc-300">
                                        No team members found
                                    </h3>
                                </div>
                            ) : (
                                <div className="overflow-x-auto">
                                    <table className="w-full">
                                        <thead>
                                            <tr className="border-b border-zinc-800/60">
                                                <th className="text-left px-6 py-3 text-xs font-medium text-zinc-500 uppercase tracking-wider">
                                                    Member
                                                </th>
                                                <th className="text-left px-6 py-3 text-xs font-medium text-zinc-500 uppercase tracking-wider">
                                                    Role
                                                </th>
                                                <th className="text-left px-6 py-3 text-xs font-medium text-zinc-500 uppercase tracking-wider">
                                                    Joined
                                                </th>
                                                <th className="px-6 py-3" />
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-zinc-800/40">
                                            {members.map((member) => (
                                                <tr
                                                    key={member.id}
                                                    className="hover:bg-zinc-800/30 transition-colors"
                                                >
                                                    <td className="px-6 py-4">
                                                        <div className="flex items-center gap-3">
                                                            <div className="w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center text-zinc-400">
                                                                <Users className="w-4 h-4" />
                                                            </div>
                                                            <div>
                                                                <p className="text-sm font-medium text-white">
                                                                    {member.userId === "pending_invite" ? "Pending Invite" : (member.user?.name || member.user?.email || member.userId)}
                                                                </p>
                                                                {member.user?.email && member.user?.name && (
                                                                    <p className="text-xs text-zinc-500">
                                                                        {member.user.email}
                                                                    </p>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <Badge
                                                            variant="outline"
                                                            className={getRoleBadgeColor(member.role)}
                                                        >
                                                            {member.role.charAt(0).toUpperCase() + member.role.slice(1)}
                                                        </Badge>
                                                    </td>
                                                    <td className="px-6 py-4 text-sm text-zinc-400">
                                                        {(() => {
                                                            try {
                                                                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                                                                const raw = member.joinedAt as any;
                                                                const date = raw?.toDate ? raw.toDate() : new Date(raw);
                                                                return formatDistanceToNow(date, { addSuffix: true });
                                                            } catch {
                                                                return "Unknown";
                                                            }
                                                        })()}
                                                    </td>
                                                    <td className="px-6 py-4 text-right">
                                                        {(userRole === "owner" || userRole === "admin") && (
                                                            <Button
                                                                variant="ghost"
                                                                size="sm"
                                                                className="text-zinc-500 hover:text-white"
                                                            >
                                                                <MoreHorizontal className="w-4 h-4" />
                                                            </Button>
                                                        )}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>

                {/* Invite Sidebar */}
                <div className="space-y-6">
                    <Card className="bg-zinc-900/60 backdrop-blur-xl border-zinc-800/60">
                        <CardContent className="p-6">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="p-2 rounded-lg bg-blue-500/10 text-blue-500">
                                    <UserPlus className="w-5 h-5" />
                                </div>
                                <h2 className="text-lg font-semibold text-white">Invite Member</h2>
                            </div>
                            <p className="text-sm text-zinc-400 mb-6">
                                Create a secure invite link to share with a new member.
                            </p>

                            {(userRole === "owner" || userRole === "admin") ? (
                                <form onSubmit={handleGenerateInvite} className="space-y-4">
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium text-zinc-300">Role for New Member</label>
                                        <select
                                            value={inviteRole}
                                            onChange={(e) => setInviteRole(e.target.value as any)}
                                            className="w-full bg-zinc-800/50 border border-zinc-700/50 text-white rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 appearance-none"
                                        >
                                            <option value="operator">Operator (Manage sessions & displays)</option>
                                            <option value="viewer">Viewer (Read-only access)</option>
                                            {userRole === "owner" && <option value="admin">Admin (Manage members & settings)</option>}
                                        </select>
                                    </div>
                                    <Button
                                        type="submit"
                                        disabled={inviting}
                                        className="w-full bg-zinc-800 hover:bg-zinc-700 text-white border border-zinc-700"
                                    >
                                        {inviting ? "Generating..." : "Generate Invite Link"}
                                    </Button>

                                    {generatedCode && (
                                        <div className="mt-4 p-4 rounded-lg bg-zinc-800/50 border border-zinc-700/50 space-y-4">
                                            <div className="flex items-center justify-between text-sm">
                                                <span className="text-zinc-400">Invite Code</span>
                                                <span className="font-mono text-blue-400 font-medium">{generatedCode}</span>
                                            </div>
                                            <Button
                                                type="button"
                                                onClick={copyToClipboard}
                                                className="w-full bg-blue-500 hover:bg-blue-600 text-white transition-all shadow-lg shadow-blue-500/25"
                                            >
                                                {copied ? (
                                                    <><Check className="w-4 h-4 mr-2" /> Copied!</>
                                                ) : (
                                                    <><Copy className="w-4 h-4 mr-2" /> Copy Invite Link</>
                                                )}
                                            </Button>
                                            <p className="text-xs text-zinc-500 text-center">
                                                Link expires in 7 days
                                            </p>
                                        </div>
                                    )}
                                </form>
                            ) : (
                                <div className="p-4 rounded-lg bg-amber-500/10 border border-amber-500/20 flex gap-3 text-amber-500/80 text-sm">
                                    <Shield className="w-4 h-4 mt-0.5 shrink-0" />
                                    <p>Only Organization Owners and Admins can invite new members.</p>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}

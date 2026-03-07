"use client";

import { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { orgService } from "@/lib/services/organization";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Captions, Loader2, Building2, Link as LinkIcon } from "lucide-react";
import { toast } from "sonner";

export function OrganizationOnboarding({ onComplete }: { onComplete: () => void }) {
    const { user } = useAuth();
    const [isLoading, setIsLoading] = useState(false);

    // Create Org State
    const [orgName, setOrgName] = useState("");

    // Join Org State
    const [inviteCode, setInviteCode] = useState("");

    const handleCreateOrganization = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user || !orgName.trim()) return;

        setIsLoading(true);
        try {
            await orgService.createOrganization(orgName.trim(), user.uid);
            toast.success("Organization created successfully");
            onComplete();
        } catch (error: any) {
            console.error("Error creating org:", error);
            toast.error(error.message || "Failed to create organization");
        } finally {
            setIsLoading(false);
        }
    };

    const handleJoinOrganization = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user || !inviteCode.trim()) return;

        setIsLoading(true);
        try {
            await orgService.joinWithInviteCode(inviteCode.trim().toUpperCase(), user.uid);
            toast.success("Successfully joined organization");
            onComplete();
        } catch (error: any) {
            console.error("Error joining org:", error);
            toast.error(error.message || "Failed to join organization");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="w-full flex flex-col items-center justify-center">
            <div className="mb-8 flex flex-col items-center gap-4">
                <div className="flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-violet-600 shadow-2xl shadow-blue-500/20">
                    <Captions className="w-8 h-8 text-white" />
                </div>
                <div className="text-center">
                    <h1 className="text-2xl font-bold text-white tracking-tight">Welcome to CaptionFlow</h1>
                    <p className="text-zinc-400 mt-2 max-w-sm">
                        To get started, you need to create a new organization or join an existing one.
                    </p>
                </div>
            </div>

            <Card className="w-full max-w-md bg-zinc-900 border-zinc-800">
                <Tabs defaultValue="create" className="w-full">
                    <TabsList className="grid w-full grid-cols-2 bg-zinc-950 rounded-t-lg border-b border-zinc-800 p-0 h-12">
                        <TabsTrigger
                            value="create"
                            className="data-[state=active]:bg-zinc-900 data-[state=active]:text-white text-zinc-400 h-full rounded-none rounded-tl-lg"
                        >
                            <Building2 className="w-4 h-4 mr-2" />
                            Create New
                        </TabsTrigger>
                        <TabsTrigger
                            value="join"
                            className="data-[state=active]:bg-zinc-900 data-[state=active]:text-white text-zinc-400 h-full rounded-none rounded-tr-lg"
                        >
                            <LinkIcon className="w-4 h-4 mr-2" />
                            Join Existing
                        </TabsTrigger>
                    </TabsList>

                    <TabsContent value="create" className="p-0 m-0">
                        <CardHeader>
                            <CardTitle>Create Organization</CardTitle>
                            <CardDescription>
                                Set up a new workspace for your team
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <form onSubmit={handleCreateOrganization} className="space-y-4">
                                <div className="space-y-2">
                                    <label htmlFor="orgName" className="text-sm font-medium text-zinc-300">
                                        Organization Name
                                    </label>
                                    <Input
                                        id="orgName"
                                        placeholder="e.g. My Church"
                                        value={orgName}
                                        onChange={(e) => setOrgName(e.target.value)}
                                        disabled={isLoading}
                                        className="bg-zinc-950 border-zinc-800 focus-visible:ring-blue-500"
                                        required
                                    />
                                </div>
                                <Button
                                    type="submit"
                                    className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                                    disabled={isLoading || !orgName.trim()}
                                >
                                    {isLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                                    Create Organization
                                </Button>
                            </form>
                        </CardContent>
                    </TabsContent>

                    <TabsContent value="join" className="p-0 m-0">
                        <CardHeader>
                            <CardTitle>Join Organization</CardTitle>
                            <CardDescription>
                                Enter an invite code from your administrator
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <form onSubmit={handleJoinOrganization} className="space-y-4">
                                <div className="space-y-2">
                                    <label htmlFor="inviteCode" className="text-sm font-medium text-zinc-300">
                                        Invite Code
                                    </label>
                                    <Input
                                        id="inviteCode"
                                        placeholder="e.g. A1B2C3D4"
                                        value={inviteCode}
                                        onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                                        disabled={isLoading}
                                        className="bg-zinc-950 border-zinc-800 focus-visible:ring-blue-500 uppercase font-mono tracking-wider"
                                        required
                                    />
                                </div>
                                <Button
                                    type="submit"
                                    className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                                    disabled={isLoading || !inviteCode.trim()}
                                >
                                    {isLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                                    Join Organization
                                </Button>
                            </form>
                        </CardContent>
                    </TabsContent>
                </Tabs>
            </Card>
        </div>
    );
}

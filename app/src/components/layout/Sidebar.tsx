"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/context/AuthContext";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
    LayoutDashboard,
    Mic,
    Monitor,
    Users,
    Settings,
    LogOut,
    ChevronLeft,
    ChevronRight,
    Captions,
} from "lucide-react";
import { useOrganization } from "@/context/OrganizationContext";
import { Check, Plus } from "lucide-react";

const navItems = [
    { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { href: "/dashboard/sessions", label: "Sessions", icon: Mic },
    { href: "/dashboard/displays", label: "Displays", icon: Monitor },
    { href: "/dashboard/team", label: "Team", icon: Users },
    { href: "/dashboard/settings", label: "Settings", icon: Settings },
];

export function Sidebar({ isMobile = false }: { isMobile?: boolean }) {
    const pathname = usePathname();
    const { user, signOut } = useAuth();
    const { organizations, currentOrganization, switchOrganization } = useOrganization();
    const [collapsed, setCollapsed] = useState(false);

    const initials = user?.displayName
        ? user.displayName
            .split(" ")
            .map((n) => n[0])
            .join("")
            .toUpperCase()
        : user?.email?.[0]?.toUpperCase() ?? "?";

    return (
        <aside
            className={cn(
                "flex flex-col bg-zinc-950 border-r border-zinc-800/60 transition-all duration-300 ease-in-out",
                isMobile ? "w-full h-full" : (collapsed ? "w-[72px] h-screen" : "w-[260px] h-screen")
            )}
        >
            {/* Brand / Organization Switcher */}
            <div className="flex flex-col px-3 py-4 border-b border-zinc-800/60">
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <button
                            className={cn(
                                "flex items-center gap-2 w-full p-2 rounded-lg hover:bg-zinc-800/50 transition-colors text-left",
                                collapsed && "justify-center"
                            )}
                        >
                            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-violet-600 shrink-0">
                                <Captions className="w-4 h-4 text-white" />
                            </div>
                            {!collapsed && (
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-semibold text-white truncate">
                                        {currentOrganization?.name || "Select Workspace"}
                                    </p>
                                    <p className="text-xs text-zinc-500 truncate">
                                        {organizations.length} Workspace{organizations.length !== 1 ? 's' : ''}
                                    </p>
                                </div>
                            )}
                        </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start" className="w-[240px]">
                        {organizations.map((org) => (
                            <DropdownMenuItem
                                key={org.id}
                                onClick={() => switchOrganization(org.id)}
                                className="flex items-center justify-between"
                            >
                                <span className="truncate">{org.name}</span>
                                {currentOrganization?.id === org.id && <Check className="w-4 h-4 ml-2" />}
                            </DropdownMenuItem>
                        ))}
                        <DropdownMenuSeparator />
                        <DropdownMenuItem asChild>
                            <Link href="/dashboard/organization/new" className="w-full flex">
                                <Plus className="w-4 h-4 mr-2" />
                                Create or Join Workspace
                            </Link>
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>

            {/* Navigation */}
            <nav className="flex-1 flex flex-col gap-1 p-3 overflow-y-auto">
                {navItems.map((item) => {
                    const isActive =
                        pathname === item.href ||
                        (item.href !== "/dashboard" && pathname.startsWith(item.href));
                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={cn(
                                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200",
                                isActive
                                    ? "bg-gradient-to-r from-blue-500/15 to-violet-500/10 text-blue-400 border border-blue-500/20"
                                    : "text-zinc-400 hover:text-white hover:bg-zinc-800/50",
                                collapsed && "justify-center px-0"
                            )}
                        >
                            <item.icon className="w-5 h-5 shrink-0" />
                            {!collapsed && <span>{item.label}</span>}
                        </Link>
                    );
                })}
            </nav>

            {/* Collapse Button */}
            {!isMobile && (
                <div className="px-3 py-1">
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setCollapsed(!collapsed)}
                        className="w-full text-zinc-500 hover:text-white hover:bg-zinc-800/50"
                    >
                        {collapsed ? (
                            <ChevronRight className="w-4 h-4" />
                        ) : (
                            <>
                                <ChevronLeft className="w-4 h-4 mr-2" />
                                <span>Collapse</span>
                            </>
                        )}
                    </Button>
                </div>
            )}

            {/* User Profile */}
            <div className="p-3 border-t border-zinc-800/60">
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <button
                            className={cn(
                                "flex items-center gap-3 w-full p-2 rounded-lg hover:bg-zinc-800/50 transition-colors",
                                collapsed && "justify-center"
                            )}
                        >
                            <Avatar className="w-8 h-8">
                                <AvatarImage src={user?.photoURL ?? undefined} />
                                <AvatarFallback className="bg-gradient-to-br from-blue-500 to-violet-600 text-white text-xs font-semibold">
                                    {initials}
                                </AvatarFallback>
                            </Avatar>
                            {!collapsed && (
                                <div className="flex-1 text-left min-w-0">
                                    <p className="text-sm font-medium text-white truncate">
                                        {user?.displayName ?? "User"}
                                    </p>
                                    <p className="text-xs text-zinc-500 truncate">
                                        {user?.email}
                                    </p>
                                </div>
                            )}
                        </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-56">
                        <DropdownMenuItem asChild>
                            <Link href="/dashboard/settings">
                                <Settings className="mr-2 w-4 h-4" />
                                Settings
                            </Link>
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={signOut} className="text-red-400">
                            <LogOut className="mr-2 w-4 h-4" />
                            Sign out
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>
        </aside>
    );
}

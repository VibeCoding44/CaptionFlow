"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    MonitorPlay,
    Plus,
    Copy,
    Settings,
    Trash2,
    Check,
    Loader2,
} from "lucide-react";
import { useEffect, useState } from "react";
import { displayService } from "@/lib/services/displays";
import { useOrganization } from "@/context/OrganizationContext";
import { Display, DisplayType } from "@/types";
import { formatDistanceToNow } from "date-fns";
import { doc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";

export default function DisplaysPage() {
    const { currentOrganization } = useOrganization();
    const [displays, setDisplays] = useState<Display[]>([]);
    const [loading, setLoading] = useState(true);
    const [creating, setCreating] = useState(false);
    const [copiedId, setCopiedId] = useState<string | null>(null);

    // Configure modal state
    const [configDisplay, setConfigDisplay] = useState<Display | null>(null);
    const [configName, setConfigName] = useState("");
    const [configType, setConfigType] = useState<DisplayType>("obs");
    const [configFontSize, setConfigFontSize] = useState("48");
    const [configFontFamily, setConfigFontFamily] = useState("Inter");
    const [configTextColor, setConfigTextColor] = useState("#FFFFFF");
    const [configBgColor, setConfigBgColor] = useState("rgba(0,0,0,0.5)");
    const [configAlignment, setConfigAlignment] = useState<"left" | "center" | "right">("center");
    const [configSaving, setConfigSaving] = useState(false);
    const [deleting, setDeleting] = useState<string | null>(null);

    useEffect(() => {
        async function loadDisplays() {
            if (!currentOrganization) {
                setLoading(false);
                return;
            }
            try {
                const data = await displayService.getDisplays(currentOrganization.id);
                setDisplays(data);
            } catch (error) {
                console.error("Error loading displays:", error);
            } finally {
                setLoading(false);
            }
        }

        loadDisplays();
    }, [currentOrganization]);

    const handleCreateDisplay = async () => {
        if (!currentOrganization) return;
        setCreating(true);
        try {
            // Setup a safety timeout of 5 seconds so it doesn't stay frozen
            const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error("Request timed out (could be offline or queued)")), 5000));

            const createPromise = async () => {
                await displayService.createDisplay({
                    organizationId: currentOrganization.id,
                    name: `Display ${displays.length + 1}`,
                    type: "obs",
                    customSettings: {
                        fontSize: 48,
                        fontFamily: "Inter",
                        textColor: "#FFFFFF",
                        backgroundColor: "rgba(0,0,0,0.5)",
                        alignment: "center",
                    }
                });
                const data = await displayService.getDisplays(currentOrganization.id);
                setDisplays(data);
            };

            await Promise.race([createPromise(), timeoutPromise]);
        } catch (error: any) {
            console.error("Failed to create display", error);
            alert(`Error creating display: ${error.message || 'Unknown error. Check console.'}`);
        } finally {
            setCreating(false);
        }
    };

    const openConfigure = (display: Display) => {
        setConfigDisplay(display);
        setConfigName(display.name);
        setConfigType(display.type);
        setConfigFontSize(String(display.customSettings.fontSize));
        setConfigFontFamily(display.customSettings.fontFamily);
        setConfigTextColor(display.customSettings.textColor);
        setConfigBgColor(display.customSettings.backgroundColor);
        setConfigAlignment(display.customSettings.alignment);
    };

    const handleSaveConfig = async () => {
        if (!configDisplay || !currentOrganization) return;
        setConfigSaving(true);
        try {
            const displayRef = doc(db, "displays", configDisplay.id);
            await updateDoc(displayRef, {
                name: configName,
                type: configType,
                customSettings: {
                    fontSize: parseInt(configFontSize),
                    fontFamily: configFontFamily,
                    textColor: configTextColor,
                    backgroundColor: configBgColor,
                    alignment: configAlignment,
                },
            });
            // Refresh the displays list
            const data = await displayService.getDisplays(currentOrganization.id);
            setDisplays(data);
            setConfigDisplay(null);
        } catch (err) {
            console.error("Failed to save display config:", err);
        } finally {
            setConfigSaving(false);
        }
    };

    const handleDeleteDisplay = async (displayId: string) => {
        if (!currentOrganization) return;
        setDeleting(displayId);
        try {
            await displayService.deleteDisplay(displayId);
            const data = await displayService.getDisplays(currentOrganization.id);
            setDisplays(data);
        } catch (err) {
            console.error("Failed to delete display:", err);
        } finally {
            setDeleting(null);
        }
    };

    const handleCopyUrl = (displayId: string) => {
        const url = `${window.location.origin}/displays/${displayId}`;
        navigator.clipboard.writeText(url);
        setCopiedId(displayId);
        setTimeout(() => setCopiedId(null), 2000);
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-white">Displays</h1>
                    <p className="text-zinc-400 mt-1">
                        Configure and manage your caption output screens
                    </p>
                </div>
                <Button
                    onClick={handleCreateDisplay}
                    disabled={creating}
                    className="bg-gradient-to-r from-blue-500 to-violet-600 hover:from-blue-600 hover:to-violet-700 text-white shadow-lg shadow-blue-500/20"
                >
                    <Plus className="w-4 h-4 mr-2" />
                    {creating ? "Creating..." : "New Display"}
                </Button>
            </div>

            {/* Displays Grid */}
            {loading ? (
                <div className="flex justify-center items-center py-20">
                    <div className="w-8 h-8 border-2 border-zinc-600 border-t-white rounded-full animate-spin" />
                </div>
            ) : displays.length === 0 ? (
                <Card className="bg-zinc-900/60 backdrop-blur-xl border-zinc-800/60">
                    <CardContent className="flex flex-col items-center justify-center py-20 text-center p-6">
                        <div className="w-16 h-16 rounded-2xl bg-zinc-800/50 border border-zinc-700/50 flex items-center justify-center mb-4">
                            <MonitorPlay className="w-8 h-8 text-zinc-600" />
                        </div>
                        <h3 className="text-xl font-semibold text-white">
                            No displays configured
                        </h3>
                        <p className="text-zinc-400 mt-2 max-w-md">
                            Create a display to generate a unique URL for OBS, ProPresenter, or your live stream.
                        </p>
                        <Button
                            onClick={handleCreateDisplay}
                            disabled={creating}
                            className="mt-6 bg-gradient-to-r from-blue-500 to-violet-600 text-white"
                        >
                            <Plus className="w-4 h-4 mr-2" />
                            Create Your First Display
                        </Button>
                    </CardContent>
                </Card>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                    {displays.map((display) => (
                        <Card key={display.id} className="bg-zinc-900/60 backdrop-blur-xl border-zinc-800/60 overflow-hidden group">
                            {/* Display Preview (Mock) */}
                            <div
                                className="h-32 w-full flex items-end justify-center pb-4 relative overflow-hidden"
                                style={{ backgroundColor: display.customSettings.backgroundColor }}
                            >
                                <div className="absolute inset-0 opacity-10" style={{
                                    backgroundImage: "linear-gradient(45deg, #808080 25%, transparent 25%), linear-gradient(-45deg, #808080 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #808080 75%), linear-gradient(-45deg, transparent 75%, #808080 75%)",
                                    backgroundSize: "20px 20px",
                                    backgroundPosition: "0 0, 0 10px, 10px -10px, -10px 0px"
                                }} />
                                <div className="relative z-10 px-4">
                                    <p
                                        className="font-bold drop-shadow-md text-center line-clamp-2"
                                        style={{
                                            color: display.customSettings.textColor,
                                            fontSize: `${Math.max(16, display.customSettings.fontSize / 3)}px`,
                                            fontFamily: display.customSettings.fontFamily,
                                            textAlign: display.customSettings.alignment
                                        }}
                                    >
                                        Live transcript preview...
                                    </p>
                                </div>
                            </div>

                            <CardContent className="p-5">
                                <div className="flex items-start justify-between mb-4">
                                    <div>
                                        <h3 className="text-lg font-semibold text-white">{display.name}</h3>
                                        <p className="text-xs text-zinc-500 mt-1">
                                            Created {formatDistanceToNow(display.createdAt, { addSuffix: true })}
                                        </p>
                                    </div>
                                    <Badge variant="outline" className="border-blue-500/30 text-blue-400 bg-blue-500/10">
                                        {display.type}
                                    </Badge>
                                </div>

                                <div className="space-y-3 mb-6">
                                    <div className="flex items-center justify-between text-sm">
                                        <span className="text-zinc-500">Font</span>
                                        <span className="text-zinc-300">{display.customSettings.fontFamily} ({display.customSettings.fontSize}px)</span>
                                    </div>
                                    <div className="flex items-center justify-between text-sm">
                                        <span className="text-zinc-500">Alignment</span>
                                        <span className="text-zinc-300 capitalize">{display.customSettings.alignment}</span>
                                    </div>
                                </div>

                                <div className="grid grid-cols-3 gap-2">
                                    <Button
                                        variant="outline"
                                        className="w-full bg-zinc-800/50 border-zinc-700/50 hover:bg-zinc-800 hover:text-white"
                                        onClick={() => openConfigure(display)}
                                    >
                                        <Settings className="w-4 h-4 mr-1" />
                                        Edit
                                    </Button>
                                    <Button
                                        variant="outline"
                                        className={`w-full bg-zinc-800/50 border-zinc-700/50 ${copiedId === display.id
                                            ? "text-emerald-400 border-emerald-500/50 bg-emerald-500/10"
                                            : "hover:bg-emerald-500/20 hover:text-emerald-400 hover:border-emerald-500/50"
                                            }`}
                                        onClick={() => handleCopyUrl(display.id)}
                                    >
                                        {copiedId === display.id ? (
                                            <><Check className="w-4 h-4 mr-1" /> Copied</>
                                        ) : (
                                            <><Copy className="w-4 h-4 mr-1" /> URL</>
                                        )}
                                    </Button>
                                    <Button
                                        variant="outline"
                                        className="w-full bg-zinc-800/50 border-zinc-700/50 hover:bg-red-500/20 hover:text-red-400 hover:border-red-500/50"
                                        onClick={() => handleDeleteDisplay(display.id)}
                                        disabled={deleting === display.id}
                                    >
                                        {deleting === display.id ? (
                                            <Loader2 className="w-4 h-4 animate-spin" />
                                        ) : (
                                            <><Trash2 className="w-4 h-4 mr-1" /> Delete</>
                                        )}
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}

            {/* Configure Display Dialog */}
            <Dialog open={!!configDisplay} onOpenChange={(open) => !open && setConfigDisplay(null)}>
                <DialogContent className="bg-zinc-900 border-zinc-800 text-white max-w-lg">
                    <DialogHeader>
                        <DialogTitle className="text-white">Configure Display</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label className="text-zinc-300">Display Name</Label>
                            <Input
                                value={configName}
                                onChange={(e) => setConfigName(e.target.value)}
                                className="bg-zinc-800/50 border-zinc-700/50 text-white"
                            />
                        </div>

                        <div className="space-y-2">
                            <Label className="text-zinc-300">Display Type</Label>
                            <Select value={configType} onValueChange={(v) => setConfigType(v as DisplayType)}>
                                <SelectTrigger className="bg-zinc-800/50 border-zinc-700/50 text-white">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="obs">OBS Browser Source</SelectItem>
                                    <SelectItem value="propresenter">ProPresenter Web Fill</SelectItem>
                                    <SelectItem value="qr">QR Code Display</SelectItem>
                                    <SelectItem value="stage">Stage Monitor</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label className="text-zinc-300">Font Size</Label>
                                <Select value={configFontSize} onValueChange={setConfigFontSize}>
                                    <SelectTrigger className="bg-zinc-800/50 border-zinc-700/50 text-white">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="24">24px — Small</SelectItem>
                                        <SelectItem value="32">32px — Medium</SelectItem>
                                        <SelectItem value="48">48px — Large</SelectItem>
                                        <SelectItem value="64">64px — XL</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-2">
                                <Label className="text-zinc-300">Font Family</Label>
                                <Select value={configFontFamily} onValueChange={setConfigFontFamily}>
                                    <SelectTrigger className="bg-zinc-800/50 border-zinc-700/50 text-white">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="Inter">Inter</SelectItem>
                                        <SelectItem value="Arial">Arial</SelectItem>
                                        <SelectItem value="Georgia">Georgia</SelectItem>
                                        <SelectItem value="monospace">Monospace</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label className="text-zinc-300">Text Color</Label>
                                <Input
                                    type="color"
                                    value={configTextColor}
                                    onChange={(e) => setConfigTextColor(e.target.value)}
                                    className="bg-zinc-800/50 border-zinc-700/50 h-10 w-full"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label className="text-zinc-300">Background Color</Label>
                                <Input
                                    type="color"
                                    value={configBgColor.startsWith("rgba") ? "#000000" : configBgColor}
                                    onChange={(e) => setConfigBgColor(e.target.value)}
                                    className="bg-zinc-800/50 border-zinc-700/50 h-10 w-full"
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label className="text-zinc-300">Text Alignment</Label>
                            <Select value={configAlignment} onValueChange={(v) => setConfigAlignment(v as "left" | "center" | "right")}>
                                <SelectTrigger className="bg-zinc-800/50 border-zinc-700/50 text-white">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="left">Left</SelectItem>
                                    <SelectItem value="center">Center</SelectItem>
                                    <SelectItem value="right">Right</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Live Preview */}
                        <div className="space-y-2">
                            <Label className="text-zinc-300">Preview</Label>
                            <div
                                className="h-24 rounded-lg flex items-center justify-center relative overflow-hidden border border-zinc-700/50"
                                style={{ backgroundColor: configBgColor.startsWith("rgba") ? "#000000" : configBgColor }}
                            >
                                <div className="absolute inset-0 opacity-10" style={{
                                    backgroundImage: "linear-gradient(45deg, #808080 25%, transparent 25%), linear-gradient(-45deg, #808080 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #808080 75%), linear-gradient(-45deg, transparent 75%, #808080 75%)",
                                    backgroundSize: "16px 16px",
                                    backgroundPosition: "0 0, 0 8px, 8px -8px, -8px 0px"
                                }} />
                                <p
                                    className="relative z-10 font-bold drop-shadow-md"
                                    style={{
                                        color: configTextColor,
                                        fontSize: `${Math.max(14, parseInt(configFontSize) / 3)}px`,
                                        fontFamily: configFontFamily,
                                        textAlign: configAlignment,
                                    }}
                                >
                                    Sample caption text
                                </p>
                            </div>
                        </div>
                    </div>

                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={() => setConfigDisplay(null)}
                            className="border-zinc-700/50 text-zinc-400 hover:text-white"
                        >
                            Cancel
                        </Button>
                        <Button
                            onClick={handleSaveConfig}
                            disabled={configSaving}
                            className="bg-gradient-to-r from-blue-500 to-violet-600 hover:from-blue-600 hover:to-violet-700 text-white"
                        >
                            {configSaving ? (
                                <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Saving...</>
                            ) : (
                                "Save Changes"
                            )}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}

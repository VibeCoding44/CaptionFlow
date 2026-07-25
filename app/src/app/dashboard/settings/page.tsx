"use client";

import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Mic,
    Languages,
    Palette,
    Plug,
    User,
    Shield,
    Save,
    Check,
    Loader2,
} from "lucide-react";
import { useOrganization } from "@/context/OrganizationContext";
import { useAuth } from "@/context/AuthContext";

const LANGUAGE_MAP: Record<string, string> = {
    es: "Spanish",
    fr: "French",
    pt: "Portuguese",
    ko: "Korean",
    zh: "Chinese",
    vi: "Vietnamese",
    ar: "Arabic",
    ru: "Russian",
    ja: "Japanese",
};

type SaveStatus = "idle" | "saving" | "saved";

export default function SettingsPage() {
    const { currentOrganization, refreshOrganization } = useOrganization();
    const { user } = useAuth();

    // Transcription settings state
    const [sourceLanguage, setSourceLanguage] = useState("en-US");
    const [keywords, setKeywords] = useState("");
    const [profanityFilter, setProfanityFilter] = useState(true);
    const [punctuation, setPunctuation] = useState(true);
    const [transcriptionSaveStatus, setTranscriptionSaveStatus] = useState<SaveStatus>("idle");

    // Translation settings state
    const [targetLanguages, setTargetLanguages] = useState<string[]>([]);
    const [translationSaveStatus, setTranslationSaveStatus] = useState<SaveStatus>("idle");

    // Display settings state
    const [defaultFontSize, setDefaultFontSize] = useState("32");
    const [textColor, setTextColor] = useState("#FFFFFF");
    const [bgColor, setBgColor] = useState("#000000");
    const [textPosition, setTextPosition] = useState("bottom");
    const [displaySaveStatus, setDisplaySaveStatus] = useState<SaveStatus>("idle");

    // Account settings state
    const [displayName, setDisplayName] = useState("");
    const [orgName, setOrgName] = useState("");
    const [orgSlug, setOrgSlug] = useState("");
    const [accountSaveStatus, setAccountSaveStatus] = useState<SaveStatus>("idle");

    // Load existing settings from organization context
    useEffect(() => {
        if (currentOrganization) {
            setSourceLanguage(currentOrganization.settings.defaultSourceLanguage || "en-US");
            setTargetLanguages(currentOrganization.settings.defaultTargetLanguages || []);
            setOrgName(currentOrganization.name || "");
            setOrgSlug(currentOrganization.slug || "");

            if (currentOrganization.transcriptionSettings) {
                setKeywords(currentOrganization.transcriptionSettings.keywords?.join("\n") || "");
                setProfanityFilter(currentOrganization.transcriptionSettings.profanityFilter ?? true);
                setPunctuation(currentOrganization.transcriptionSettings.punctuation ?? true);
            }
        }
        if (user) {
            setDisplayName(user.displayName || "");
        }
    }, [currentOrganization, user]);

    const handleSaveTranscription = async () => {
        if (!currentOrganization) return;
        setTranscriptionSaveStatus("saving");
        try {
            const { orgService } = await import("@/lib/services/organization");
            await orgService.updateSettings(currentOrganization.id, {
                defaultSourceLanguage: sourceLanguage,
            });
            await orgService.updateTranscriptionSettings(currentOrganization.id, {
                keywords: keywords.split("\n").map(k => k.trim()).filter(Boolean),
                profanityFilter,
                punctuation,
            });
            await refreshOrganization();
            setTranscriptionSaveStatus("saved");
            setTimeout(() => setTranscriptionSaveStatus("idle"), 2000);
        } catch (err) {
            console.error("Failed to save transcription settings:", err);
            setTranscriptionSaveStatus("idle");
        }
    };

    const handleSaveTranslation = async () => {
        if (!currentOrganization) return;
        setTranslationSaveStatus("saving");
        try {
            const { orgService } = await import("@/lib/services/organization");
            await orgService.updateSettings(currentOrganization.id, {
                defaultTargetLanguages: targetLanguages,
            });
            await refreshOrganization();
            setTranslationSaveStatus("saved");
            setTimeout(() => setTranslationSaveStatus("idle"), 2000);
        } catch (err) {
            console.error("Failed to save translation settings:", err);
            setTranslationSaveStatus("idle");
        }
    };

    const handleSaveDisplay = async () => {
        if (!currentOrganization) return;
        setDisplaySaveStatus("saving");
        try {
            const { doc, updateDoc } = await import("firebase/firestore");
            const { db } = await import("@/lib/firebase");
            const orgRef = doc(db, "organizations", currentOrganization.id);
            await updateDoc(orgRef, {
                "settings.defaultDisplay": {
                    fontSize: parseInt(defaultFontSize),
                    textColor,
                    backgroundColor: bgColor,
                    textPosition,
                },
            });
            await refreshOrganization();
            setDisplaySaveStatus("saved");
            setTimeout(() => setDisplaySaveStatus("idle"), 2000);
        } catch (err) {
            console.error("Failed to save display settings:", err);
            setDisplaySaveStatus("idle");
        }
    };

    const handleSaveAccount = async () => {
        if (!user || !currentOrganization) return;
        setAccountSaveStatus("saving");
        try {
            const { updateProfile } = await import("firebase/auth");
            const { doc, updateDoc } = await import("firebase/firestore");
            const { db } = await import("@/lib/firebase");

            // Update Firebase Auth display name
            await updateProfile(user, { displayName });

            // Update Firestore user doc
            const userRef = doc(db, "users", user.uid);
            await updateDoc(userRef, { name: displayName });

            // Ensure slug is unique if it's changing or newly added
            let finalSlug = orgSlug;
            if (finalSlug && finalSlug !== currentOrganization.slug) {
                const response = await fetch(`/api/organizations/check-slug?slug=${encodeURIComponent(finalSlug)}&orgId=${encodeURIComponent(currentOrganization.id)}`);
                if (!response.ok) {
                    throw new Error("Failed to validate slug uniqueness");
                }
                const data = await response.json();
                finalSlug = data.uniqueSlug;
            }

            // Update organization name and slug
            const orgRef = doc(db, "organizations", currentOrganization.id);
            await updateDoc(orgRef, {
                name: orgName,
                ...(finalSlug ? { slug: finalSlug } : {})
            });
            await refreshOrganization();

            setOrgSlug(finalSlug); // update local state with final slug
            setAccountSaveStatus("saved");
            setTimeout(() => setAccountSaveStatus("idle"), 2000);
        } catch (err) {
            console.error("Failed to save account settings:", err);
            setAccountSaveStatus("idle");
        }
    };

    const handleGenerateSlug = () => {
        if (!orgName) return;
        const newSlug = orgName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
        setOrgSlug(newSlug || 'org');
    };

    const toggleLanguage = (langCode: string) => {
        setTargetLanguages(prev =>
            prev.includes(langCode)
                ? prev.filter(l => l !== langCode)
                : [...prev, langCode]
        );
    };

    const renderSaveButton = (status: SaveStatus, onClick: () => void) => (
        <Button
            onClick={onClick}
            disabled={status === "saving"}
            className={
                status === "saved"
                    ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                    : "bg-gradient-to-r from-blue-500 to-violet-600 hover:from-blue-600 hover:to-violet-700 text-white"
            }
        >
            {status === "saving" ? (
                <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Saving...
                </>
            ) : status === "saved" ? (
                <>
                    <Check className="w-4 h-4 mr-2" />
                    Saved!
                </>
            ) : (
                <>
                    <Save className="w-4 h-4 mr-2" />
                    Save Changes
                </>
            )}
        </Button>
    );

    return (
        <div className="space-y-6">
            {/* Header */}
            <div>
                <h1 className="text-2xl font-bold text-white">Settings</h1>
                <p className="text-zinc-400 mt-1">
                    Configure your CaptionFlow preferences
                </p>
            </div>

            <Tabs defaultValue="transcription" className="space-y-6">
                <TabsList className="bg-zinc-900/60 border border-zinc-800/60 p-1">
                    <TabsTrigger
                        value="transcription"
                        className="data-[state=active]:bg-zinc-800 data-[state=active]:text-white text-zinc-400"
                    >
                        <Mic className="w-4 h-4 mr-2" />
                        Transcription
                    </TabsTrigger>
                    <TabsTrigger
                        value="translation"
                        className="data-[state=active]:bg-zinc-800 data-[state=active]:text-white text-zinc-400"
                    >
                        <Languages className="w-4 h-4 mr-2" />
                        Translation
                    </TabsTrigger>
                    <TabsTrigger
                        value="display"
                        className="data-[state=active]:bg-zinc-800 data-[state=active]:text-white text-zinc-400"
                    >
                        <Palette className="w-4 h-4 mr-2" />
                        Display
                    </TabsTrigger>
                    <TabsTrigger
                        value="integrations"
                        className="data-[state=active]:bg-zinc-800 data-[state=active]:text-white text-zinc-400"
                    >
                        <Plug className="w-4 h-4 mr-2" />
                        Integrations
                    </TabsTrigger>
                    <TabsTrigger
                        value="account"
                        className="data-[state=active]:bg-zinc-800 data-[state=active]:text-white text-zinc-400"
                    >
                        <User className="w-4 h-4 mr-2" />
                        Account
                    </TabsTrigger>
                </TabsList>

                {/* Transcription Settings */}
                <TabsContent value="transcription">
                    <Card className="bg-zinc-900/60 backdrop-blur-xl border-zinc-800/60">
                        <CardContent className="p-6 space-y-6">
                            <div>
                                <h3 className="text-lg font-semibold text-white mb-1">
                                    Transcription Settings
                                </h3>
                                <p className="text-sm text-zinc-500">
                                    Configure your speech-to-text preferences
                                </p>
                            </div>
                            <Separator className="bg-zinc-800" />

                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <Label className="text-zinc-300">Default Source Language</Label>
                                    <Select value={sourceLanguage} onValueChange={setSourceLanguage}>
                                        <SelectTrigger className="bg-zinc-800/50 border-zinc-700/50 text-white">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="en-US">English (US)</SelectItem>
                                            <SelectItem value="en-GB">English (UK)</SelectItem>
                                            <SelectItem value="es">Spanish</SelectItem>
                                            <SelectItem value="fr">French</SelectItem>
                                            <SelectItem value="de">German</SelectItem>
                                            <SelectItem value="pt">Portuguese</SelectItem>
                                            <SelectItem value="ko">Korean</SelectItem>
                                            <SelectItem value="zh">Chinese</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="space-y-2">
                                    <Label className="text-zinc-300">Custom Keywords</Label>
                                    <Textarea
                                        value={keywords}
                                        onChange={(e) => setKeywords(e.target.value)}
                                        placeholder="Enter domain-specific words, one per line (e.g., liturgy, communion, benediction)"
                                        className="bg-zinc-800/50 border-zinc-700/50 text-white placeholder:text-zinc-500 min-h-[100px]"
                                    />
                                    <p className="text-xs text-zinc-500">
                                        These keywords help improve transcription accuracy for
                                        domain-specific vocabulary. They are sent to Deepgram as keyword boosts.
                                    </p>
                                </div>

                                <div className="flex items-center justify-between p-4 rounded-xl bg-zinc-800/30 border border-zinc-800/40">
                                    <div>
                                        <p className="text-sm font-medium text-white">
                                            Profanity Filter
                                        </p>
                                        <p className="text-xs text-zinc-500">
                                            Automatically mask profanity in transcriptions
                                        </p>
                                    </div>
                                    <Switch
                                        checked={profanityFilter}
                                        onCheckedChange={setProfanityFilter}
                                    />
                                </div>

                                <div className="flex items-center justify-between p-4 rounded-xl bg-zinc-800/30 border border-zinc-800/40">
                                    <div>
                                        <p className="text-sm font-medium text-white">
                                            Punctuation
                                        </p>
                                        <p className="text-xs text-zinc-500">
                                            Automatically add punctuation to transcriptions
                                        </p>
                                    </div>
                                    <Switch
                                        checked={punctuation}
                                        onCheckedChange={setPunctuation}
                                    />
                                </div>
                            </div>

                            <div className="flex justify-end">
                                {renderSaveButton(transcriptionSaveStatus, handleSaveTranscription)}
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Translation Settings */}
                <TabsContent value="translation">
                    <Card className="bg-zinc-900/60 backdrop-blur-xl border-zinc-800/60">
                        <CardContent className="p-6 space-y-6">
                            <div>
                                <h3 className="text-lg font-semibold text-white mb-1">
                                    Translation Defaults
                                </h3>
                                <p className="text-sm text-zinc-500">
                                    Set default translation languages for new sessions
                                </p>
                            </div>
                            <Separator className="bg-zinc-800" />

                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <Label className="text-zinc-300">Default Target Languages</Label>
                                    <p className="text-xs text-zinc-500 mb-2">
                                        Select the languages you most commonly translate to. These
                                        will be pre-selected when creating new sessions.
                                    </p>
                                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                                        {Object.entries(LANGUAGE_MAP).map(([code, name]) => (
                                            <div
                                                key={code}
                                                className="flex items-center gap-3 p-3 rounded-lg bg-zinc-800/30 border border-zinc-800/40 hover:border-zinc-700/60 transition-colors cursor-pointer"
                                                onClick={() => toggleLanguage(code)}
                                            >
                                                <Switch
                                                    checked={targetLanguages.includes(code)}
                                                    onCheckedChange={() => toggleLanguage(code)}
                                                />
                                                <span className="text-sm text-zinc-300">{name}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            <div className="flex justify-end">
                                {renderSaveButton(translationSaveStatus, handleSaveTranslation)}
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Display Settings */}
                <TabsContent value="display">
                    <Card className="bg-zinc-900/60 backdrop-blur-xl border-zinc-800/60">
                        <CardContent className="p-6 space-y-6">
                            <div>
                                <h3 className="text-lg font-semibold text-white mb-1">
                                    Default Display Style
                                </h3>
                                <p className="text-sm text-zinc-500">
                                    Set default visual styles for new caption displays
                                </p>
                            </div>
                            <Separator className="bg-zinc-800" />

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <Label className="text-zinc-300">Font Size</Label>
                                    <Select value={defaultFontSize} onValueChange={setDefaultFontSize}>
                                        <SelectTrigger className="bg-zinc-800/50 border-zinc-700/50 text-white">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="24">24px — Small</SelectItem>
                                            <SelectItem value="32">32px — Medium</SelectItem>
                                            <SelectItem value="48">48px — Large</SelectItem>
                                            <SelectItem value="64">64px — Extra Large</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-zinc-300">Text Color</Label>
                                    <Input
                                        type="color"
                                        value={textColor}
                                        onChange={(e) => setTextColor(e.target.value)}
                                        className="bg-zinc-800/50 border-zinc-700/50 h-10 w-full"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-zinc-300">Background Color</Label>
                                    <Input
                                        type="color"
                                        value={bgColor}
                                        onChange={(e) => setBgColor(e.target.value)}
                                        className="bg-zinc-800/50 border-zinc-700/50 h-10 w-full"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-zinc-300">Text Position</Label>
                                    <Select value={textPosition} onValueChange={setTextPosition}>
                                        <SelectTrigger className="bg-zinc-800/50 border-zinc-700/50 text-white">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="top">Top</SelectItem>
                                            <SelectItem value="center">Center</SelectItem>
                                            <SelectItem value="bottom">Bottom</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>

                            <div className="flex justify-end">
                                {renderSaveButton(displaySaveStatus, handleSaveDisplay)}
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Integrations Settings */}
                <TabsContent value="integrations">
                    <Card className="bg-zinc-900/60 backdrop-blur-xl border-zinc-800/60">
                        <CardContent className="p-6 space-y-6">
                            <div>
                                <h3 className="text-lg font-semibold text-white mb-1">
                                    Integrations
                                </h3>
                                <p className="text-sm text-zinc-500">
                                    Connected services powering your live captions
                                </p>
                            </div>
                            <Separator className="bg-zinc-800" />

                            <div className="space-y-4">
                                <div className="p-4 rounded-xl bg-zinc-800/30 border border-zinc-800/40">
                                    <div className="flex items-center justify-between mb-2">
                                        <div className="flex items-center gap-3">
                                            <Shield className="w-5 h-5 text-blue-400" />
                                            <p className="text-sm font-medium text-white">
                                                Deepgram
                                            </p>
                                        </div>
                                        <span className="text-xs px-2 py-1 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                                            Connected
                                        </span>
                                    </div>
                                    <p className="text-xs text-zinc-500 ml-8">
                                        Real-time speech-to-text transcription via Nova-2 model
                                    </p>
                                </div>

                                <div className="p-4 rounded-xl bg-zinc-800/30 border border-zinc-800/40">
                                    <div className="flex items-center justify-between mb-2">
                                        <div className="flex items-center gap-3">
                                            <Languages className="w-5 h-5 text-emerald-400" />
                                            <p className="text-sm font-medium text-white">
                                                Google Cloud Translation
                                            </p>
                                        </div>
                                        <span className="text-xs px-2 py-1 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                                            Connected
                                        </span>
                                    </div>
                                    <p className="text-xs text-zinc-500 ml-8">
                                        Multi-language translation support via v2 Basic API
                                    </p>
                                </div>

                                <div className="p-4 rounded-xl bg-zinc-800/30 border border-zinc-800/40">
                                    <div className="flex items-center justify-between mb-2">
                                        <div className="flex items-center gap-3">
                                            <Plug className="w-5 h-5 text-violet-400" />
                                            <p className="text-sm font-medium text-white">
                                                Pusher
                                            </p>
                                        </div>
                                        <span className="text-xs px-2 py-1 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                                            Connected
                                        </span>
                                    </div>
                                    <p className="text-xs text-zinc-500 ml-8">
                                        Real-time broadcasting of captions to viewer displays
                                    </p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Account Settings */}
                <TabsContent value="account">
                    <Card className="bg-zinc-900/60 backdrop-blur-xl border-zinc-800/60">
                        <CardContent className="p-6 space-y-6">
                            <div>
                                <h3 className="text-lg font-semibold text-white mb-1">
                                    Account Settings
                                </h3>
                                <p className="text-sm text-zinc-500">
                                    Manage your account details
                                </p>
                            </div>
                            <Separator className="bg-zinc-800" />

                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <Label className="text-zinc-300">Display Name</Label>
                                    <Input
                                        value={displayName}
                                        onChange={(e) => setDisplayName(e.target.value)}
                                        placeholder="Your name"
                                        className="bg-zinc-800/50 border-zinc-700/50 text-white placeholder:text-zinc-500"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-zinc-300">Email</Label>
                                    <Input
                                        value={user?.email || ""}
                                        disabled
                                        className="bg-zinc-800/50 border-zinc-700/50 text-zinc-400"
                                    />
                                    <p className="text-xs text-zinc-500">
                                        Email cannot be changed here.
                                    </p>
                                </div>

                                <Separator className="bg-zinc-800/60 my-6" />

                                <div className="space-y-2">
                                    <Label className="text-zinc-300">Organization Name</Label>
                                    <Input
                                        value={orgName}
                                        onChange={(e) => setOrgName(e.target.value)}
                                        placeholder="Your church or organization"
                                        className="bg-zinc-800/50 border-zinc-700/50 text-white placeholder:text-zinc-500"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <div className="flex items-center justify-between">
                                        <Label className="text-zinc-300">Organization URL Slug</Label>
                                        {!orgSlug && (
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={handleGenerateSlug}
                                                className="h-6 text-xs text-blue-400 hover:text-blue-300 px-2"
                                            >
                                                Generate Slug
                                            </Button>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className="text-zinc-500 text-sm hidden sm:inline-block">caption-flow.com/live/</span>
                                        <Input
                                            value={orgSlug}
                                            onChange={(e) => setOrgSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                                            placeholder="my-organization"
                                            className="bg-zinc-800/50 border-zinc-700/50 text-white placeholder:text-zinc-500 font-mono text-sm"
                                        />
                                    </div>
                                    <p className="text-xs text-zinc-500">
                                        This is the permanent link attendees use to find your live broadcasts. Must be letter, numbers, and hyphens.
                                    </p>
                                </div>
                            </div>

                            <div className="flex justify-end pt-4">
                                {renderSaveButton(accountSaveStatus, handleSaveAccount)}
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
}

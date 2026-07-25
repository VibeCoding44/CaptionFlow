"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { useOrganization } from "@/context/OrganizationContext";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, ArrowRight, Mic, CheckCircle2, Languages, Loader2 } from "lucide-react";
import Link from "next/link";

const sourceLanguages = [
    { value: "en", label: "English" },
    { value: "es", label: "Spanish" },
    { value: "fr", label: "French" },
    { value: "de", label: "German" },
];

const targetLanguagesOptions = [
    { value: "es", label: "Spanish" },
    { value: "fr", label: "French" },
    { value: "de", label: "German" },
    { value: "it", label: "Italian" },
    { value: "pt", label: "Portuguese" },
    { value: "ko", label: "Korean" },
    { value: "ja", label: "Japanese" },
    { value: "zh", label: "Chinese (Simplified)" },
];

export default function NewSessionPage() {
    const router = useRouter();
    const { user } = useAuth();
    const { currentOrganization } = useOrganization();

    const [step, setStep] = useState(1);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Form State
    const [sessionName, setSessionName] = useState("");
    const [sourceLanguage, setSourceLanguage] = useState("en");
    const [targetLanguages, setTargetLanguages] = useState<string[]>([]);

    const toggleTargetLanguage = (langValue: string) => {
        setTargetLanguages(prev =>
            prev.includes(langValue)
                ? prev.filter(l => l !== langValue)
                : [...prev, langValue]
        );
    };

    const handleCreateSession = async () => {
        if (!user || !currentOrganization) return;

        setIsSubmitting(true);
        try {
            const { sessionService } = await import("@/lib/services/sessions");
            const sessionId: string = await sessionService.createSession(
                currentOrganization.id,
                sessionName,
                sourceLanguage,
                targetLanguages,
                user.uid
            );

            router.push(`/dashboard/sessions/${sessionId}/live`);
        } catch (error: any) {
            console.error("Error creating session:", error);
            alert("Error creating session: " + error.message);
            setIsSubmitting(false);
        }
    };

    return (
        <div className="max-w-3xl mx-auto space-y-6">
            <div className="flex items-center gap-4">
                <Button variant="ghost" size="icon" asChild className="text-zinc-400 hover:text-white">
                    <Link href="/dashboard">
                        <ArrowLeft className="w-5 h-5" />
                    </Link>
                </Button>
                <div>
                    <h1 className="text-2xl font-bold text-white">New Captioning Session</h1>
                    <p className="text-zinc-400 mt-1">Configure your live translation settings</p>
                </div>
            </div>

            {/* Stepper */}
            <div className="flex items-center justify-between mb-8 px-4">
                {[1, 2, 3].map((s) => (
                    <div key={s} className="flex flex-col items-center gap-2">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold transition-colors duration-300 ${step >= s ? "bg-blue-600 text-white shadow-lg shadow-blue-500/30" : "bg-zinc-800 text-zinc-500 border border-zinc-700"
                            }`}>
                            {s}
                        </div>
                        <span className={`text-xs font-medium ${step >= s ? "text-blue-400" : "text-zinc-500"}`}>
                            {s === 1 ? "Details" : s === 2 ? "Languages" : "Review"}
                        </span>
                    </div>
                ))}

                {/* Connecting Lines */}
                <div className="absolute left-[10%] right-[10%] h-[2px] bg-zinc-800 -z-10 mt-[-20px] ml-16 mr-16" />
            </div>

            <Card className="bg-zinc-900/60 backdrop-blur-xl border-zinc-800/60 overflow-hidden relative">
                <CardHeader>
                    <CardTitle className="text-xl text-white">
                        {step === 1 && "Session Details"}
                        {step === 2 && "Translation Targets"}
                        {step === 3 && "Review & Start"}
                    </CardTitle>
                    <CardDescription className="text-zinc-400">
                        {step === 1 && "Name your session and choose the spoken language."}
                        {step === 2 && "Select which languages you want to translate the captions into."}
                        {step === 3 && "Verify your settings before going live."}
                    </CardDescription>
                </CardHeader>

                <CardContent className="space-y-6">
                    {step === 1 && (
                        <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
                            <div className="space-y-2">
                                <Label htmlFor="name" className="text-zinc-300">Session Name</Label>
                                <Input
                                    id="name"
                                    placeholder="e.g., Sunday Morning Service, Q3 All-Hands"
                                    value={sessionName}
                                    onChange={(e) => setSessionName(e.target.value)}
                                    className="bg-zinc-950/50 border-zinc-800 text-white placeholder:text-zinc-600 focus-visible:ring-blue-500"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label className="text-zinc-300">Spoken Language (Source)</Label>
                                <Select value={sourceLanguage} onValueChange={setSourceLanguage}>
                                    <SelectTrigger className="bg-zinc-950/50 border-zinc-800 text-white">
                                        <SelectValue placeholder="Select language" />
                                    </SelectTrigger>
                                    <SelectContent className="bg-zinc-900 border-zinc-800 text-white">
                                        {sourceLanguages.map(lang => (
                                            <SelectItem key={lang.value} value={lang.value}>{lang.label}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                    )}

                    {step === 2 && (
                        <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
                            <Label className="text-zinc-300">Select Target Languages</Label>
                            <div className="grid grid-cols-2 gap-3">
                                {targetLanguagesOptions.filter(lang => lang.value !== sourceLanguage).map((lang) => {
                                    const isSelected = targetLanguages.includes(lang.value);
                                    return (
                                        <div
                                            key={lang.value}
                                            onClick={() => toggleTargetLanguage(lang.value)}
                                            className={`p-3 rounded-lg border cursor-pointer transition-all flex items-center justify-between ${isSelected
                                                ? "bg-blue-500/10 border-blue-500 text-blue-400"
                                                : "bg-zinc-950/50 border-zinc-800 text-zinc-400 hover:border-zinc-700 hover:text-zinc-300"
                                                }`}
                                        >
                                            <div className="flex items-center gap-2">
                                                <Languages className="w-4 h-4" />
                                                <span className="font-medium">{lang.label}</span>
                                            </div>
                                            {isSelected && <CheckCircle2 className="w-4 h-4" />}
                                        </div>
                                    )
                                })}
                            </div>
                            {targetLanguages.length === 0 && (
                                <p className="text-sm text-amber-500 mt-2">No target languages selected. Only original captions will be displayed.</p>
                            )}
                        </div>
                    )}

                    {step === 3 && (
                        <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                            <div className="rounded-xl border border-zinc-800 bg-zinc-950/50 p-6 space-y-4">
                                <div>
                                    <p className="text-sm font-medium text-zinc-500">Session Name</p>
                                    <p className="text-lg font-semibold text-white mt-1">{sessionName || "Untitled Session"}</p>
                                </div>
                                <div className="grid grid-cols-2 gap-4 pt-4 border-t border-zinc-800/50">
                                    <div>
                                        <p className="text-sm font-medium text-zinc-500">Source Language</p>
                                        <div className="flex items-center gap-2 mt-2">
                                            <div className="w-8 h-8 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center font-bold text-xs">
                                                {sourceLanguage.toUpperCase()}
                                            </div>
                                            <span className="text-white">
                                                {sourceLanguages.find(l => l.value === sourceLanguage)?.label}
                                            </span>
                                        </div>
                                    </div>
                                    <div>
                                        <p className="text-sm font-medium text-zinc-500">Translation Targets ({targetLanguages.length})</p>
                                        <div className="flex flex-wrap gap-2 mt-2">
                                            {targetLanguages.length > 0 ? targetLanguages.map(lang => (
                                                <Badge key={lang} variant="secondary" className="bg-violet-500/20 text-violet-400 hover:bg-violet-500/30">
                                                    {targetLanguagesOptions.find(l => l.value === lang)?.label}
                                                </Badge>
                                            )) : (
                                                <span className="text-zinc-500 text-sm">None selected</span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="p-4 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-start gap-3">
                                <Mic className="w-5 h-5 mt-0.5 flex-shrink-0" />
                                <p className="text-sm">When you click Start, you will be redirected to the live dashboard where you can authorize microphone access and begin broadcasting.</p>
                            </div>
                        </div>
                    )}
                </CardContent>

                <CardFooter className="flex justify-between border-t border-zinc-800/60 pt-6">
                    <Button
                        variant="ghost"
                        onClick={() => setStep(step - 1)}
                        disabled={step === 1 || isSubmitting}
                        className="text-zinc-400 hover:text-white"
                    >
                        Back
                    </Button>

                    {step < 3 ? (
                        <Button
                            onClick={() => setStep(step + 1)}
                            disabled={(step === 1 && !sessionName.trim())}
                            className="bg-zinc-100 text-zinc-900 hover:bg-white"
                        >
                            Next Step
                            <ArrowRight className="w-4 h-4 ml-2" />
                        </Button>
                    ) : (
                        <Button
                            onClick={handleCreateSession}
                            disabled={isSubmitting}
                            className="bg-gradient-to-r from-blue-500 to-violet-600 hover:from-blue-600 hover:to-violet-700 text-white shadow-lg shadow-blue-500/20"
                        >
                            {isSubmitting ? (
                                <>
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                    Starting...
                                </>
                            ) : (
                                <>
                                    <Mic className="w-4 h-4 mr-2" />
                                    Start Session
                                </>
                            )}
                        </Button>
                    )}
                </CardFooter>
            </Card>
        </div>
    );
}

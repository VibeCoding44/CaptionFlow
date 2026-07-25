"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { useOrganization } from "@/context/OrganizationContext";
import { Session } from "@/types";
import {
    CaptionPipeline,
    TranscriptEvent,
    PipelineStatus,
} from "@/lib/services/caption-pipeline";
import { getPusherClient, getSessionChannel, CAPTION_EVENT } from "@/lib/pusher-client";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
    Mic,
    MicOff,
    Radio,
    Square,
    Settings,
    Copy,
    ExternalLink,
    RefreshCw,
    Languages,
    AlertCircle,
    CheckCircle2,
    Loader2,
    Volume2,
} from "lucide-react";
import Link from "next/link";
import QRCodePanel from "@/components/session/QRCodePanel";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";

interface CaptionLine {
    id: string;
    text: string;
    isFinal: boolean;
    translations: Record<string, string>;
    timestamp: number;
}

interface TranslationLine {
    id: string;
    translations: Record<string, string>;
    timestamp: number;
}

export default function LiveSessionPage() {
    const params = useParams();
    const router = useRouter();
    useAuth();
    const { currentOrganization } = useOrganization();

    const [session, setSession] = useState<Session | null>(null);
    const [loading, setLoading] = useState(true);
    const [isLive, setIsLive] = useState(false);

    // Captioning state
    const [pipelineStatus, setPipelineStatus] = useState<PipelineStatus>("idle");
    const [captions, setCaptions] = useState<CaptionLine[]>([]);
    const [interimCaption, setInterimCaption] = useState("");
    const [interimTranslations, setInterimTranslations] = useState<Record<string, string>>({});
    const [translationHistory, setTranslationHistory] = useState<TranslationLine[]>([]);
    const [error, setError] = useState<string | null>(null);
    const [copied, setCopied] = useState(false);

    // Audio device state
    const [audioDevices, setAudioDevices] = useState<MediaDeviceInfo[]>([]);
    const [selectedDeviceId, setSelectedDeviceId] = useState<string>("default");

    const pipelineRef = useRef<CaptionPipeline | null>(null);
    const captionEndRef = useRef<HTMLDivElement>(null);
    const translationEndRef = useRef<HTMLDivElement>(null);

    const sessionId = params.id as string;

    // Auto-scroll captions
    useEffect(() => {
        captionEndRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }, [captions, interimCaption]);

    useEffect(() => {
        translationEndRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }, [translationHistory, interimTranslations]);

    // Fetch available audio devices
    useEffect(() => {
        async function fetchDevices() {
            try {
                // We ask for permission first to get access to device labels
                await navigator.mediaDevices.getUserMedia({ audio: true });
                const devices = await navigator.mediaDevices.enumerateDevices();
                const audioInputDevices = devices.filter(device => device.kind === "audioinput");
                setAudioDevices(audioInputDevices);

                if (audioInputDevices.length > 0 && selectedDeviceId === "default") {
                    setSelectedDeviceId(audioInputDevices[0].deviceId);
                }
            } catch (err) {
                console.error("Error fetching audio devices. Permission likely denied.", err);
            }
        }

        if (typeof window !== "undefined") {
            fetchDevices();
        }
    }, []);

    // Fetch session
    useEffect(() => {
        async function fetchSession() {
            if (!sessionId || !currentOrganization) return;


            try {
                const { doc, getDoc } = await import("firebase/firestore");
                const { db } = await import("@/lib/firebase");
                const { sessionService } = await import("@/lib/services/sessions");

                const docRef = doc(db, "sessions", sessionId);
                const docSnap = await getDoc(docRef);

                if (docSnap.exists()) {
                    const data = docSnap.data() as Session;
                    if (data.organizationId === currentOrganization.id) {
                        setSession(data);
                        setIsLive(data.status === "live");

                        if (data.status === "completed") {
                            try {
                                const transcripts = await sessionService.getTranscripts(data.id);

                                const loadedCaptions = transcripts.map(t => ({
                                    id: t.id || `cap-${t.timestamp}`,
                                    text: t.text,
                                    isFinal: true,
                                    translations: t.translations,
                                    timestamp: t.timestamp
                                }));

                                const loadedTranslations = transcripts
                                    .filter(t => Object.keys(t.translations).length > 0)
                                    .map(t => ({
                                        id: `tl-${t.timestamp}`,
                                        translations: t.translations,
                                        timestamp: t.timestamp
                                    }));

                                setCaptions(loadedCaptions);
                                setTranslationHistory(loadedTranslations);
                            } catch (e) {
                                console.error("Error loading historical transcripts:", e);
                            }
                        }

                    } else {
                        router.push("/dashboard");
                    }
                } else {
                    router.push("/dashboard");
                }
            } catch (err) {
                console.error("Error fetching session:", err);
            } finally {
                setLoading(false);
            }
        }

        fetchSession();
    }, [sessionId, currentOrganization, router]);

    // Subscribe to Pusher for translations (so the host also receives broadcast data)
    useEffect(() => {
        if (!sessionId || !isLive) return;

        const pusher = getPusherClient();
        const channel = pusher.subscribe(getSessionChannel(sessionId));

        channel.bind(CAPTION_EVENT, (data: {
            text: string;
            sourceLanguage: string;
            translations: Record<string, string>;
            isFinal: boolean;
            timestamp: number;
        }) => {
            if (data.isFinal && Object.keys(data.translations).length > 0) {
                setTranslationHistory((prev) => [
                    ...prev,
                    {
                        id: `tl-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
                        translations: data.translations,
                        timestamp: data.timestamp,
                    },
                ]);
                setInterimTranslations({});
            } else if (!data.isFinal && Object.keys(data.translations).length > 0) {
                setInterimTranslations(data.translations);
            }
        });

        return () => {
            channel.unbind_all();
            pusher.unsubscribe(getSessionChannel(sessionId));
        };
    }, [sessionId, isLive]);

    // Transcript callback
    const handleTranscript = useCallback((event: TranscriptEvent) => {
        if (event.isFinal) {
            setCaptions((prev) => [
                ...prev,
                {
                    id: `cap-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
                    text: event.text,
                    isFinal: true,
                    translations: event.translations,
                    timestamp: event.timestamp,
                },
            ]);
            setInterimCaption("");
            // Transcript is saved server-side in /api/broadcast with translations
        } else {
            setInterimCaption(event.text);
        }
    }, []);

    // Broadcast a status change over Pusher (endpoint requires operator auth)
    const broadcastStatus = async (sessionId: string, status: string) => {
        try {
            const { auth } = await import("@/lib/firebase");
            const idToken = await auth.currentUser?.getIdToken();
            await fetch("/api/broadcast/status", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    ...(idToken ? { Authorization: `Bearer ${idToken}` } : {}),
                },
                body: JSON.stringify({ sessionId, status }),
            });
        } catch (err) {
            console.error("Status broadcast failed:", err);
        }
    };

    // Toggle broadcast
    const handleToggleBroadcast = async () => {
        if (!session) return;

        if (isLive) {
            // --- STOP ---
            pipelineRef.current?.stop();
            pipelineRef.current = null;

            const timeUpdates = { endTime: Date.now() };
            try {
                const { sessionService } = await import("@/lib/services/sessions");
                await sessionService.updateSessionStatus(session.id, "completed", timeUpdates);
                setIsLive(false);
                setSession({ ...session, status: "completed", ...timeUpdates });
                setError(null);

                // Broadcast the status change over Pusher
                void broadcastStatus(session.id, "completed");
            } catch (err) {
                console.error("Error stopping broadcast:", err);
            }
        } else {
            // --- START ---
            const timeUpdates = { startTime: Date.now() };
            try {
                const { sessionService } = await import("@/lib/services/sessions");
                await sessionService.updateSessionStatus(session.id, "live", timeUpdates);
                setIsLive(true);
                setSession({ ...session, status: "live", ...timeUpdates });
                setCaptions([]);
                setInterimCaption("");
                setTranslationHistory([]);
                setInterimTranslations({});
                setError(null);

                // Broadcast the status change over Pusher
                void broadcastStatus(session.id, "live");

                // Create and start the captioning pipeline
                const pipeline = new CaptionPipeline({
                    sessionId: session.id,
                    sourceLanguage: session.sourceLanguage,
                    targetLanguages: session.targetLanguages,
                    deviceId: selectedDeviceId !== "default" ? selectedDeviceId : undefined,
                    keywords: currentOrganization?.transcriptionSettings?.keywords,
                    profanityFilter: currentOrganization?.transcriptionSettings?.profanityFilter ?? true,
                    punctuation: currentOrganization?.transcriptionSettings?.punctuation ?? true,
                    onTranscript: handleTranscript,
                    onStatusChange: setPipelineStatus,
                    onError: (errMsg) => setError(errMsg),
                });

                pipelineRef.current = pipeline;
                await pipeline.start();
            } catch (err) {
                console.error("Error starting broadcast:", err);
                setError("Failed to start broadcast");
            }
        }
    };

    // Copy display URL
    const handleCopyUrl = () => {
        const url = `${window.location.origin}/displays/global?session=${session?.id}`;
        navigator.clipboard.writeText(url);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    // Cleanup on unmount — also persist session status
    const sessionRef = useRef(session);
    const isLiveRef = useRef(isLive);
    useEffect(() => { sessionRef.current = session; }, [session]);
    useEffect(() => { isLiveRef.current = isLive; }, [isLive]);

    useEffect(() => {
        return () => {
            // Stop the microphone/pipeline on unmount, but do NOT end the session.
            // The session stays "live" so the user can come back to it.
            pipelineRef.current?.stop();
        };
    }, []);

    // Warn users about navigating away while live
    useEffect(() => {
        const handleBeforeUnload = (e: BeforeUnloadEvent) => {
            if (isLiveRef.current) {
                e.preventDefault();
                e.returnValue = "You are currently broadcasting. If you leave, the microphone will stop but the session will remain active.";
                return e.returnValue;
            }
        };

        window.addEventListener("beforeunload", handleBeforeUnload);

        return () => {
            window.removeEventListener("beforeunload", handleBeforeUnload);
        };
    }, []);

    // Explicit navigation handler for the breadcrumb
    const handleNavigation = async (href: string) => {
        if (isLive) {
            const confirmLeave = window.confirm(
                "You are currently broadcasting. The microphone will stop but the session will remain active. You can return to resume. Continue?"
            );
            if (!confirmLeave) return;

            // Stop the pipeline (mic) but keep the session live
            pipelineRef.current?.stop();
        }
        router.push(href);
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <RefreshCw className="w-8 h-8 animate-spin text-zinc-500" />
            </div>
        );
    }

    if (!session) return null;

    // Pipeline status indicator
    const statusConfig: Record<PipelineStatus, { icon: React.ReactNode; label: string; color: string }> = {
        idle: { icon: <Mic className="w-3 h-3" />, label: "Ready", color: "text-zinc-400 border-zinc-700" },
        connecting: { icon: <Loader2 className="w-3 h-3 animate-spin" />, label: "Connecting...", color: "text-amber-400 border-amber-500/30" },
        listening: { icon: <Volume2 className="w-3 h-3" />, label: "Listening", color: "text-emerald-400 border-emerald-500/30" },
        error: { icon: <AlertCircle className="w-3 h-3" />, label: "Error", color: "text-red-400 border-red-500/30" },
        stopped: { icon: <MicOff className="w-3 h-3" />, label: "Stopped", color: "text-zinc-400 border-zinc-700" },
    };

    const currentStatus = statusConfig[pipelineStatus];

    return (
        <div className="space-y-6">
            {/* Header Area */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <div className="flex items-center gap-3">
                        <Button
                            variant="ghost"
                            size="sm"
                            className="text-zinc-400 hover:text-white px-2 cursor-pointer"
                            onClick={() => handleNavigation("/dashboard/sessions")}
                        >
                            <span className="flex items-center">Sessions</span>
                        </Button>
                        <span className="text-zinc-600">/</span>
                        <h1 className="text-2xl font-bold text-white flex items-center gap-3">
                            {session.name}
                            {isLive ? (
                                <Badge className="bg-red-500/10 text-red-500 border-red-500/20 animate-pulse">
                                    <Radio className="w-3 h-3 mr-1" />
                                    LIVE
                                </Badge>
                            ) : session.status === "completed" ? (
                                <Badge variant="outline" className="text-zinc-400 border-zinc-700">Finished</Badge>
                            ) : (
                                <Badge variant="outline" className="text-blue-400 border-blue-500/30">Ready</Badge>
                            )}
                        </h1>
                    </div>
                    <p className="text-zinc-400 mt-1 pl-2">
                        {session.sourceLanguage.toUpperCase()} → {session.targetLanguages.map(l => l.toUpperCase()).join(", ") || "No translations"}
                    </p>
                </div>

                <div className="flex items-center gap-3">
                    {/* Pipeline status indicator */}
                    {isLive && (
                        <Badge variant="outline" className={`${currentStatus.color} flex items-center gap-1.5`}>
                            {currentStatus.icon}
                            {currentStatus.label}
                        </Badge>
                    )}

                    {!isLive && audioDevices.length > 0 && (
                        <Select value={selectedDeviceId} onValueChange={setSelectedDeviceId} disabled={isLive}>
                            <SelectTrigger className="w-[180px] sm:w-[220px] bg-zinc-900/50 border-zinc-700 text-zinc-300">
                                <SelectValue placeholder="Select Microphone" />
                            </SelectTrigger>
                            <SelectContent className="bg-zinc-900 border-zinc-800 text-zinc-300">
                                {audioDevices.map((device) => (
                                    <SelectItem key={device.deviceId} value={device.deviceId} className="focus:bg-zinc-800 focus:text-white cursor-pointer">
                                        {device.label || `Microphone ${device.deviceId.slice(0, 5)}...`}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    )}

                    <Button variant="outline" className="border-zinc-700 text-zinc-300 hover:bg-zinc-800 hover:text-white">
                        <Settings className="w-4 h-4 mr-2" />
                        Settings
                    </Button>
                    <Button
                        onClick={handleToggleBroadcast}
                        className={isLive
                            ? "bg-red-500 hover:bg-red-600 text-white shadow-lg shadow-red-500/20"
                            : "bg-gradient-to-r from-blue-500 to-violet-600 hover:from-blue-600 hover:to-violet-700 text-white shadow-lg shadow-blue-500/20"
                        }
                    >
                        {isLive ? (
                            <>
                                <Square className="w-4 h-4 mr-2 fill-current" />
                                End Broadcast
                            </>
                        ) : (
                            <>
                                <Mic className="w-4 h-4 mr-2" />
                                Start Broadcast
                            </>
                        )}
                    </Button>
                </div>
            </div>

            {/* Error Banner */}
            {error && (
                <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 flex items-center gap-3">
                    <AlertCircle className="w-5 h-5 text-red-400 shrink-0" />
                    <p className="text-sm text-red-300">{error}</p>
                    <Button
                        size="sm"
                        variant="ghost"
                        className="ml-auto text-red-400 hover:text-red-300 hover:bg-red-500/10"
                        onClick={() => setError(null)}
                    >
                        Dismiss
                    </Button>
                </div>
            )}

            {/* Display Link Card */}
            <Card className="bg-blue-500/5 border-blue-500/20">
                <CardContent className="p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                    <div>
                        <p className="text-sm font-medium text-blue-400">Universal Display URL</p>
                        <p className="text-xs text-zinc-400 mt-1">Use this link in ProPresenter, OBS, or attendee devices.</p>
                    </div>
                    <div className="flex items-center gap-2">
                        <code className="text-xs bg-zinc-900/50 px-3 py-2 rounded-md border border-zinc-800 text-zinc-300 break-all">
                            {typeof window !== "undefined" ? window.location.origin : ""}/displays/global?session={session.id}
                        </code>
                        <Button
                            size="icon"
                            variant="ghost"
                            className="text-zinc-400 hover:text-white shrink-0"
                            onClick={handleCopyUrl}
                        >
                            {copied ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                        </Button>
                        <Button size="icon" variant="ghost" className="text-zinc-400 hover:text-white shrink-0" asChild>
                            <a href={`/displays/global?session=${session.id}`} target="_blank" rel="noopener noreferrer">
                                <ExternalLink className="w-4 h-4" />
                            </a>
                        </Button>
                    </div>
                </CardContent>
            </Card>

            {/* Audience Live Translation QR Code */}
            {isLive && <QRCodePanel sessionId={session.id} organizationSlug={currentOrganization?.slug} />}

            {/* Live Transcript Area */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[500px]">
                {/* Source transcript panel */}
                <Card className="lg:col-span-2 bg-zinc-900/60 backdrop-blur-xl border-zinc-800/60 overflow-hidden flex flex-col">
                    <div className="p-4 border-b border-zinc-800/60 bg-zinc-950/30 flex items-center justify-between">
                        <h2 className="text-sm font-medium text-zinc-300 flex items-center gap-2">
                            <Mic className="w-4 h-4 text-blue-400" />
                            Source Transcript ({session.sourceLanguage.toUpperCase()})
                        </h2>
                        {isLive && pipelineStatus === "listening" && (
                            <div className="flex items-center gap-1.5">
                                <span className="relative flex h-2 w-2">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                                    <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
                                </span>
                                <span className="text-xs text-red-400">Recording</span>
                            </div>
                        )}
                    </div>
                    <CardContent className="flex-1 p-6 relative overflow-y-auto">
                        {!isLive && session.status !== "completed" ? (
                            <div className="absolute inset-0 flex flex-col items-center justify-center text-zinc-500">
                                <Mic className="w-12 h-12 mb-3 text-zinc-700" />
                                <p>Click &quot;Start Broadcast&quot; to begin captioning</p>
                                <p className="text-xs text-zinc-600 mt-2">Your microphone will be requested</p>
                            </div>
                        ) : captions.length === 0 && !interimCaption ? (
                            <div className="absolute inset-0 flex flex-col items-center justify-center text-zinc-500">
                                {isLive ? (
                                    <>
                                        <Volume2 className="w-12 h-12 mb-3 text-zinc-700 animate-pulse" />
                                        <p>Listening... speak into your microphone</p>
                                    </>
                                ) : (
                                    <>
                                        <Mic className="w-12 h-12 mb-3 text-zinc-700" />
                                        <p>Session ended. No captions were recorded.</p>
                                    </>
                                )}
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {captions.map((cap) => (
                                    <p
                                        key={cap.id}
                                        className="text-xl text-zinc-200 leading-relaxed font-light"
                                    >
                                        {cap.text}
                                    </p>
                                ))}
                                {interimCaption && (
                                    <p className="text-xl text-zinc-500 leading-relaxed font-light italic">
                                        {interimCaption}
                                    </p>
                                )}
                                <div ref={captionEndRef} />
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Translations Sidebar */}
                <Card className="bg-zinc-900/60 backdrop-blur-xl border-zinc-800/60 overflow-hidden flex flex-col">
                    <div className="p-4 border-b border-zinc-800/60 bg-zinc-950/30">
                        <h2 className="text-sm font-medium text-zinc-300 flex items-center gap-2">
                            <Languages className="w-4 h-4 text-violet-400" />
                            Live Translations
                        </h2>
                    </div>
                    <CardContent className="flex-1 p-0 overflow-y-auto">
                        {session.targetLanguages.length === 0 ? (
                            <div className="p-6 text-center text-sm text-zinc-500">
                                No translation targets configured for this session.
                            </div>
                        ) : (
                            <div className="divide-y divide-zinc-800/60">
                                {session.targetLanguages.map(lang => (
                                    <div key={lang} className="p-4">
                                        <div className="flex items-center justify-between mb-2">
                                            <Badge variant="outline" className="border-zinc-700 text-xs text-zinc-400 uppercase">{lang}</Badge>
                                        </div>
                                        <div className="space-y-2">
                                            {translationHistory.length > 0 ? (
                                                translationHistory.map((line) => (
                                                    <p key={line.id} className="text-sm text-zinc-300">
                                                        {line.translations[lang] || ""}
                                                    </p>
                                                ))
                                            ) : (
                                                !interimTranslations[lang] && (
                                                    <p className="text-sm text-zinc-500">
                                                        {!isLive && session.status !== "completed"
                                                            ? "Waiting for broadcast..."
                                                            : isLive
                                                                ? "Listening..."
                                                                : "No translations recorded."
                                                        }
                                                    </p>
                                                )
                                            )}
                                            {interimTranslations[lang] && (
                                                <p className="text-sm text-zinc-500 italic">
                                                    {interimTranslations[lang]}
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                ))}
                                <div ref={translationEndRef} />
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}

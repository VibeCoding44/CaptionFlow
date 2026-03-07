"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { displayService } from "@/lib/services/displays";
import { sessionService } from "@/lib/services/sessions";
import CaptionOverlay from "@/components/viewer/CaptionOverlay";
import { Display, Session } from "@/types";
import { Languages, Type as TypeIcon, Maximize, Minimize } from "lucide-react";

export default function DisplayViewerPage() {
    const params = useParams();
    const searchParams = useSearchParams();
    const displayId = params.id as string;

    // Query parameters
    const sessionIdParam = searchParams.get("session");
    const bgParam = searchParams.get("bg"); // "transparent" for OBS/ProPresenter
    const langParam = searchParams.get("lang"); // pre-select a language

    const [display, setDisplay] = useState<Display | null>(null);
    const [session, setSession] = useState<Session | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Controls
    const [selectedLanguage, setSelectedLanguage] = useState<string | null>(langParam);
    const [fontScale, setFontScale] = useState(1);
    const [showControls, setShowControls] = useState(true);
    const [isFullscreen, setIsFullscreen] = useState(false);

    const isTransparent = bgParam === "transparent";

    // Fetch display and session data
    useEffect(() => {
        async function load() {
            try {
                // Load display configuration
                const displayData = await displayService.getDisplay(displayId);
                if (!displayData) {
                    setError("Display not found. Check the URL and try again.");
                    setLoading(false);
                    return;
                }
                setDisplay(displayData);

                // If a session ID is provided, load it
                if (sessionIdParam) {
                    const sessionData = await sessionService.getSession(sessionIdParam);
                    if (sessionData) {
                        setSession(sessionData);
                    } else {
                        setError("Session not found.");
                    }
                }
            } catch (err) {
                console.error("Error loading display:", err);
                setError("Failed to load display configuration.");
            } finally {
                setLoading(false);
            }
        }

        load();
    }, [displayId, sessionIdParam]);

    // Fullscreen toggle
    const toggleFullscreen = useCallback(() => {
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen();
            setIsFullscreen(true);
        } else {
            document.exitFullscreen();
            setIsFullscreen(false);
        }
    }, []);

    // Auto-hide controls after inactivity
    useEffect(() => {
        if (isTransparent) {
            setShowControls(false);
            return;
        }

        let timeout: NodeJS.Timeout;
        const handleMouseMove = () => {
            setShowControls(true);
            clearTimeout(timeout);
            timeout = setTimeout(() => setShowControls(false), 4000);
        };

        window.addEventListener("mousemove", handleMouseMove);
        window.addEventListener("touchstart", handleMouseMove);

        // Show controls initially for 4 seconds
        timeout = setTimeout(() => setShowControls(false), 4000);

        return () => {
            clearTimeout(timeout);
            window.removeEventListener("mousemove", handleMouseMove);
            window.removeEventListener("touchstart", handleMouseMove);
        };
    }, [isTransparent]);

    // --- RENDER ---

    // Loading state
    if (loading) {
        return (
            <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
                <div className="text-center">
                    <div className="w-10 h-10 border-2 border-zinc-700 border-t-blue-500 rounded-full animate-spin mx-auto mb-4" />
                    <p className="text-zinc-400 text-sm">Loading display...</p>
                </div>
            </div>
        );
    }

    // Error state
    if (error || !display) {
        return (
            <div className="min-h-screen bg-zinc-950 flex items-center justify-center px-6">
                <div className="text-center max-w-md">
                    <div className="w-16 h-16 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center mx-auto mb-4">
                        <Languages className="w-8 h-8 text-red-400" />
                    </div>
                    <h2 className="text-xl font-semibold text-white mb-2">Display Not Available</h2>
                    <p className="text-zinc-400 text-sm">{error || "This display could not be loaded."}</p>
                </div>
            </div>
        );
    }

    // Waiting for session
    if (!session || !sessionIdParam) {
        return (
            <div className="min-h-screen bg-zinc-950 flex items-center justify-center px-6">
                <div className="text-center max-w-md">
                    <div className="w-16 h-16 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center mx-auto mb-6">
                        <Languages className="w-8 h-8 text-blue-400" />
                    </div>
                    <h2 className="text-xl font-bold text-white mb-2">
                        {display.name}
                    </h2>
                    <p className="text-zinc-400 text-sm mb-6">
                        No active session linked. A session ID must be provided as a query parameter.
                    </p>
                    <div className="bg-zinc-900/60 border border-zinc-800/60 rounded-lg p-4 text-left">
                        <p className="text-xs text-zinc-500 mb-2">URL Format:</p>
                        <code className="text-xs text-blue-400 break-all">
                            /displays/{display.id}?session=SESSION_ID
                        </code>
                    </div>
                </div>
            </div>
        );
    }

    // Scale the display settings based on the user's font slider
    const scaledDisplay: Display = {
        ...display,
        customSettings: {
            ...display.customSettings,
            fontSize: Math.round(display.customSettings.fontSize * fontScale),
        },
    };

    return (
        <div
            className="w-screen h-screen overflow-hidden relative"
            style={{ backgroundColor: isTransparent ? "transparent" : display.customSettings.backgroundColor }}
        >
            {/* Main caption overlay */}
            <CaptionOverlay
                sessionId={session.id}
                display={scaledDisplay}
                transparentBg={isTransparent}
                selectedLanguage={selectedLanguage}
            />

            {/* Floating controls — hidden in transparent mode and auto-hide on inactivity */}
            <div
                className={`absolute top-0 left-0 right-0 z-50 transition-all duration-500 ${showControls ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-full pointer-events-none"
                    }`}
            >
                <div className="bg-zinc-950/80 backdrop-blur-xl border-b border-zinc-800/60 px-4 py-3">
                    <div className="flex items-center justify-between max-w-4xl mx-auto">

                        {/* Display name and session info */}
                        <div className="flex items-center gap-3 min-w-0">
                            <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse flex-shrink-0" />
                            <div className="min-w-0">
                                <p className="text-sm font-medium text-white truncate">{session.name}</p>
                                <p className="text-xs text-zinc-500">{display.name}</p>
                            </div>
                        </div>

                        {/* Controls */}
                        <div className="flex items-center gap-3">

                            {/* Language selector */}
                            {session.targetLanguages.length > 0 && (
                                <div className="flex items-center gap-1.5">
                                    <Languages className="w-3.5 h-3.5 text-zinc-500" />
                                    <select
                                        value={selectedLanguage || ""}
                                        onChange={(e) => setSelectedLanguage(e.target.value || null)}
                                        className="bg-zinc-800/60 border border-zinc-700/50 rounded-md px-2 py-1 text-xs text-zinc-300 focus:outline-none focus:ring-1 focus:ring-blue-500/50"
                                    >
                                        <option value="">Source ({session.sourceLanguage})</option>
                                        {session.targetLanguages.map((lang) => (
                                            <option key={lang} value={lang}>{lang.toUpperCase()}</option>
                                        ))}
                                    </select>
                                </div>
                            )}

                            {/* Font size control */}
                            <div className="flex items-center gap-1.5">
                                <TypeIcon className="w-3.5 h-3.5 text-zinc-500" />
                                <input
                                    type="range"
                                    min="0.5"
                                    max="2"
                                    step="0.1"
                                    value={fontScale}
                                    onChange={(e) => setFontScale(parseFloat(e.target.value))}
                                    className="w-20 h-1 bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
                                />
                            </div>

                            {/* Fullscreen toggle */}
                            <button
                                onClick={toggleFullscreen}
                                className="p-1.5 rounded-md hover:bg-zinc-800/60 text-zinc-400 hover:text-white transition-colors"
                            >
                                {isFullscreen ? (
                                    <Minimize className="w-4 h-4" />
                                ) : (
                                    <Maximize className="w-4 h-4" />
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

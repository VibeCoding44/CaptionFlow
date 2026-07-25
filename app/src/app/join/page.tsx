"use client";

import { Suspense, useEffect, useState, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { useCaptionStream, captionDisplayText } from "@/hooks/useCaptionStream";
import { Languages, Globe, Sun, Moon, ChevronDown, Wifi, AArrowDown, AArrowUp } from "lucide-react";

const LANGUAGE_LABELS: Record<string, string> = {
    en: "English",
    es: "Español",
    fr: "Français",
    de: "Deutsch",
    pt: "Português",
    zh: "中文",
    ja: "日本語",
    ko: "한국어",
    ar: "العربية",
    hi: "हिन्दी",
    ru: "Русский",
    it: "Italiano",
    nl: "Nederlands",
    tr: "Türkçe",
    vi: "Tiếng Việt",
    th: "ไทย",
    pl: "Polski",
    uk: "Українська",
    sw: "Kiswahili",
    tl: "Filipino",
};

const LANGUAGE_FLAGS: Record<string, string> = {
    en: "🇺🇸", es: "🇪🇸", fr: "🇫🇷", de: "🇩🇪", pt: "🇧🇷",
    zh: "🇨🇳", ja: "🇯🇵", ko: "🇰🇷", ar: "🇸🇦", hi: "🇮🇳",
    ru: "🇷🇺", it: "🇮🇹", nl: "🇳🇱", tr: "🇹🇷", vi: "🇻🇳",
    th: "🇹🇭", pl: "🇵🇱", uk: "🇺🇦", sw: "🇰🇪", tl: "🇵🇭",
};

// Audience-adjustable caption sizes (a11y: core audience is deaf/HoH and
// low-vision — let them scale up well past the default).
const FONT_SIZES = ["text-xl", "text-2xl", "text-3xl", "text-4xl", "text-5xl"];
const DEFAULT_FONT_INDEX = 1;

export default function AudienceJoinPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
                <div className="w-10 h-10 border-2 border-zinc-700 border-t-blue-500 rounded-full animate-spin" />
            </div>
        }>
            <AudienceJoinContent />
        </Suspense>
    );
}

function AudienceJoinContent() {
    const searchParams = useSearchParams();
    const sessionId = searchParams.get("session");

    const { lines: captions, interim, connected, sessionStatus, setSessionStatus, discoveredLanguages } =
        useCaptionStream(sessionId);

    const [selectedLanguage, setSelectedLanguage] = useState<string | null>(null);
    const [seededLanguages, setSeededLanguages] = useState<string[]>([]);
    const [isDark, setIsDark] = useState(true);
    const [showLanguagePicker, setShowLanguagePicker] = useState(true);
    const [fontIndex, setFontIndex] = useState(DEFAULT_FONT_INDEX);

    // Session languages configured up front + languages discovered from broadcasts
    const availableLanguages = Array.from(new Set([...seededLanguages, ...discoveredLanguages]));
    const fontClass = FONT_SIZES[fontIndex];
    const interimText = interim ? captionDisplayText(interim, selectedLanguage) : "";

    const scrollRef = useRef<HTMLDivElement>(null);
    const mainRef = useRef<HTMLElement>(null);
    const [isAutoScroll, setIsAutoScroll] = useState(true);

    // Auto-scroll
    useEffect(() => {
        if (isAutoScroll) {
            scrollRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
        }
    }, [captions, interimText, isAutoScroll]);

    // Restore the viewer's preferred caption size
    useEffect(() => {
        const saved = Number(localStorage.getItem("captionflow_font_index"));
        if (!Number.isNaN(saved) && saved >= 0 && saved < FONT_SIZES.length) {
            setFontIndex(saved);
        }
    }, []);

    const adjustFont = (delta: number) => {
        setFontIndex((prev) => {
            const next = Math.min(FONT_SIZES.length - 1, Math.max(0, prev + delta));
            localStorage.setItem("captionflow_font_index", String(next));
            return next;
        });
    };

    const handleScroll = (e: React.UIEvent<HTMLElement>) => {
        const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
        // Within 100px of the bottom means we keep auto-scrolling
        const atBottom = scrollHeight - scrollTop - clientHeight < 100;
        setIsAutoScroll(atBottom);
    };

    // Seed the language picker from the session's configured target languages
    // so attendees can pick their language immediately, before the speaker
    // starts. Broadcast-discovered languages still merge in afterward.
    useEffect(() => {
        if (!sessionId) return;
        let cancelled = false;

        (async () => {
            try {
                const res = await fetch(`/api/sessions/${sessionId}/info`);
                if (!res.ok || cancelled) return;
                const info = await res.json();

                if (Array.isArray(info.targetLanguages) && info.targetLanguages.length > 0) {
                    setSeededLanguages(info.targetLanguages);
                }
                if (info.status) setSessionStatus(info.status);
            } catch {
                // Non-fatal: fall back to discovering languages from broadcasts.
            }
        })();

        return () => { cancelled = true; };
    }, [sessionId]);

    // No session ID
    if (!sessionId) {
        return (
            <div className="min-h-screen bg-zinc-950 flex items-center justify-center px-6">
                <div className="text-center max-w-sm">
                    <div className="w-16 h-16 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center mx-auto mb-4">
                        <Languages className="w-8 h-8 text-red-400" />
                    </div>
                    <h1 className="text-xl font-bold text-white mb-2">Invalid Link</h1>
                    <p className="text-zinc-400 text-sm">
                        This link is missing a session ID. Please scan the QR code provided by your event organizer.
                    </p>
                </div>
            </div>
        );
    }

    const bgColor = isDark ? "bg-zinc-950" : "bg-white";
    const textColor = isDark ? "text-white" : "text-zinc-900";
    const mutedColor = isDark ? "text-zinc-500" : "text-zinc-400";
    const interimColor = isDark ? "text-zinc-600" : "text-zinc-300";
    const cardBg = isDark ? "bg-zinc-900/50 border-zinc-800/60" : "bg-zinc-100 border-zinc-200";
    const headerBg = isDark ? "bg-zinc-900/90 border-zinc-800/60" : "bg-white/90 border-zinc-200";

    if (sessionStatus === "completed") {
        return (
            <div className={`min-h-screen ${bgColor} flex items-center justify-center p-4 transition-colors duration-300`}>
                <div className={`${cardBg} rounded-2xl border p-8 max-w-lg w-full text-center space-y-6`}>
                    <div className="mx-auto w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mb-6">
                        <Languages className="w-8 h-8 text-red-500" />
                    </div>

                    <h1 className={`text-2xl font-semibold ${textColor}`}>
                        Broadcast Ended
                    </h1>

                    <p className={`text-lg ${mutedColor}`}>
                        The broadcaster has ended this session.
                    </p>

                    <div className="h-px bg-zinc-800/60 my-8 w-full"></div>

                    <p className={`text-sm ${mutedColor}`}>
                        Thank you for joining.
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className={`h-[100dvh] overflow-hidden ${bgColor} flex flex-col transition-colors duration-300`}>
            {/* Sticky header */}
            <header className={`sticky top-0 z-50 ${headerBg} backdrop-blur-xl border-b px-4 py-3 safe-area-top`}>
                <div className="flex items-center justify-between max-w-lg mx-auto">
                    <div className="flex items-center gap-2 min-w-0">
                        <div className={`w-2 h-2 rounded-full ${connected ? "bg-emerald-400 animate-pulse" : "bg-zinc-600"}`} />
                        <span className={`text-sm font-medium ${textColor} truncate`}>
                            CaptionFlow
                        </span>
                        {connected && (
                            <span className="text-xs text-emerald-400">Live</span>
                        )}
                    </div>

                    <div className="flex items-center gap-2">
                        {/* Language button */}
                        <button
                            onClick={() => setShowLanguagePicker(!showLanguagePicker)}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors
                                ${selectedLanguage
                                    ? "bg-blue-500/10 text-blue-400 border border-blue-500/20"
                                    : isDark
                                        ? "bg-zinc-800 text-zinc-300 border border-zinc-700"
                                        : "bg-zinc-200 text-zinc-700 border border-zinc-300"
                                }`}
                        >
                            <Globe className="w-3.5 h-3.5" />
                            {selectedLanguage
                                ? `${LANGUAGE_FLAGS[selectedLanguage] || ""} ${LANGUAGE_LABELS[selectedLanguage] || selectedLanguage.toUpperCase()}`
                                : "Source"
                            }
                            <ChevronDown className="w-3 h-3" />
                        </button>

                        {/* Caption size controls */}
                        <button
                            onClick={() => adjustFont(-1)}
                            disabled={fontIndex === 0}
                            aria-label="Decrease caption size"
                            className={`p-2 rounded-full transition-colors disabled:opacity-30 ${isDark ? "text-zinc-400 hover:text-white hover:bg-zinc-800" : "text-zinc-500 hover:text-zinc-900 hover:bg-zinc-200"}`}
                        >
                            <AArrowDown className="w-4 h-4" />
                        </button>
                        <button
                            onClick={() => adjustFont(1)}
                            disabled={fontIndex === FONT_SIZES.length - 1}
                            aria-label="Increase caption size"
                            className={`p-2 rounded-full transition-colors disabled:opacity-30 ${isDark ? "text-zinc-400 hover:text-white hover:bg-zinc-800" : "text-zinc-500 hover:text-zinc-900 hover:bg-zinc-200"}`}
                        >
                            <AArrowUp className="w-4 h-4" />
                        </button>

                        {/* Theme toggle */}
                        <button
                            onClick={() => setIsDark(!isDark)}
                            aria-label="Toggle light or dark theme"
                            className={`p-2 rounded-full transition-colors ${isDark ? "text-zinc-400 hover:text-white hover:bg-zinc-800" : "text-zinc-500 hover:text-zinc-900 hover:bg-zinc-200"}`}
                        >
                            {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
                        </button>
                    </div>
                </div>

                {/* Language picker dropdown */}
                {showLanguagePicker && availableLanguages.length > 0 && (
                    <div className="max-w-lg mx-auto mt-3">
                        <div className={`rounded-xl ${cardBg} border p-3`}>
                            <p className={`text-xs ${mutedColor} mb-2 font-medium`}>Select your language</p>
                            <div className="grid grid-cols-2 gap-1.5">
                                {/* Source language option */}
                                <button
                                    onClick={() => { setSelectedLanguage(null); setShowLanguagePicker(false); }}
                                    className={`flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium transition-all
                                        ${!selectedLanguage
                                            ? "bg-blue-500/15 text-blue-400 ring-1 ring-blue-500/30"
                                            : isDark ? "hover:bg-zinc-800 text-zinc-300" : "hover:bg-zinc-200 text-zinc-700"
                                        }`
                                    }
                                >
                                    <Wifi className="w-4 h-4" />
                                    Source
                                </button>
                                {availableLanguages.map((lang) => (
                                    <button
                                        key={lang}
                                        onClick={() => { setSelectedLanguage(lang); setShowLanguagePicker(false); }}
                                        className={`flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium transition-all
                                            ${selectedLanguage === lang
                                                ? "bg-blue-500/15 text-blue-400 ring-1 ring-blue-500/30"
                                                : isDark ? "hover:bg-zinc-800 text-zinc-300" : "hover:bg-zinc-200 text-zinc-700"
                                            }`
                                        }
                                    >
                                        <span className="text-base">{LANGUAGE_FLAGS[lang] || "🌐"}</span>
                                        {LANGUAGE_LABELS[lang] || lang.toUpperCase()}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                )}
            </header>

            {/* Caption display area */}
            <main
                ref={mainRef}
                onScroll={handleScroll}
                className="flex-1 px-4 py-6 overflow-y-auto"
            >
                <div className="max-w-lg mx-auto">
                    {captions.length === 0 && !interimText ? (
                        <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
                            <div className={`w-20 h-20 rounded-3xl ${isDark ? "bg-blue-500/10 border-blue-500/20" : "bg-blue-50 border-blue-200"} border flex items-center justify-center mb-6`}>
                                <Languages className={`w-10 h-10 ${isDark ? "text-blue-400" : "text-blue-500"}`} />
                            </div>
                            <h2 className={`text-xl font-bold ${textColor} mb-2`}>
                                {connected ? "Connected & Waiting" : "Connecting..."}
                            </h2>
                            <p className={`text-sm ${mutedColor} max-w-xs leading-relaxed`}>
                                {connected
                                    ? "You're connected to the live session. Captions will appear here when the speaker begins."
                                    : "Connecting to the live session..."
                                }
                            </p>
                            {connected && (
                                <div className="mt-6 flex items-center gap-2">
                                    <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                                    <span className="text-xs text-emerald-400">Listening for captions</span>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {captions.map((cap) => (
                                <p
                                    key={cap.id}
                                    className={`${fontClass} leading-relaxed font-normal ${textColor} animate-in fade-in slide-in-from-bottom-2 duration-300`}
                                >
                                    {captionDisplayText(cap, selectedLanguage)}
                                </p>
                            ))}
                            {interimText && (
                                <p className={`${fontClass} leading-relaxed font-normal ${interimColor} italic`}>
                                    {interimText}
                                </p>
                            )}
                            <div ref={scrollRef} className="h-4" />
                        </div>
                    )}
                </div>
            </main>

            {/* Bottom bar */}
            <footer className={`sticky bottom-0 ${headerBg} backdrop-blur-xl border-t px-4 py-2 safe-area-bottom`}>
                <div className="max-w-lg mx-auto flex items-center justify-between">
                    <span className={`text-xs ${mutedColor}`}>
                        Powered by CaptionFlow
                    </span>
                    <span className={`text-xs ${mutedColor}`}>
                        {captions.length} caption{captions.length !== 1 ? "s" : ""}
                    </span>
                </div>
            </footer>
        </div>
    );
}

"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { getPusherClient, getSessionChannel, CAPTION_EVENT, STATUS_EVENT } from "@/lib/pusher-client";
import { Display } from "@/types";

interface CaptionLine {
    id: string;
    text: string;
    translations: Record<string, string>;
    timestamp: number;
}

interface CaptionOverlayProps {
    sessionId: string;
    display: Display;
    transparentBg?: boolean;
    selectedLanguage?: string | null;
}

export default function CaptionOverlay({
    sessionId,
    display,
    transparentBg = false,
    selectedLanguage = null,
}: CaptionOverlayProps) {
    const [lines, setLines] = useState<CaptionLine[]>([]);
    const [interimData, setInterimData] = useState<{ text: string, translations: Record<string, string> } | null>(null);
    const [connected, setConnected] = useState(false);
    const [sessionStatus, setSessionStatus] = useState("live");
    const scrollRef = useRef<HTMLDivElement>(null);

    // Auto-scroll to bottom when new captions arrive
    useEffect(() => {
        scrollRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }, [lines, interimData]);

    // Subscribe to Pusher channel
    useEffect(() => {
        if (!sessionId) return;

        const pusher = getPusherClient();
        const channel = pusher.subscribe(getSessionChannel(sessionId));

        channel.bind("pusher:subscription_succeeded", () => {
            setConnected(true);
        });

        channel.bind(CAPTION_EVENT, (data: {
            text: string;
            sourceLanguage: string;
            translations: Record<string, string>;
            isFinal: boolean;
            timestamp: number;
        }) => {
            if (data.isFinal) {
                setLines((prev) => {
                    // Keep only the last 50 lines to avoid memory issues
                    const updated = [
                        ...prev,
                        {
                            id: `line-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
                            text: data.text,
                            translations: data.translations,
                            timestamp: data.timestamp,
                        },
                    ];
                    return updated.slice(-50);
                });
                setInterimData(null);
            } else {
                setInterimData({ text: data.text, translations: data.translations });
            }
        });

        channel.bind(STATUS_EVENT, (data: { status: string }) => {
            if (data.status) {
                setSessionStatus(data.status);
                if (data.status === "completed") {
                    setLines([]);
                    setInterimData(null);
                }
            }
        });

        return () => {
            channel.unbind_all();
            pusher.unsubscribe(getSessionChannel(sessionId));
            setConnected(false);
        };
    }, [sessionId]);

    const getDisplayText = useCallback(
        (line: CaptionLine) => {
            if (selectedLanguage && line.translations[selectedLanguage]) {
                return line.translations[selectedLanguage];
            }
            return line.text;
        },
        [selectedLanguage]
    );

    const {
        fontSize,
        fontFamily,
        textColor,
        backgroundColor,
        alignment,
    } = display.customSettings;

    const containerStyle: React.CSSProperties = {
        backgroundColor: transparentBg ? "transparent" : backgroundColor,
        color: textColor,
        fontFamily: fontFamily,
        textAlign: alignment as React.CSSProperties["textAlign"],
    };

    return (
        <div
            className="w-full h-full flex flex-col justify-end overflow-hidden"
            style={containerStyle}
        >
            {/* Caption lines */}
            <div className="flex-1 overflow-y-auto px-4 py-2 flex flex-col justify-end">
                <div className="space-y-2">
                    {lines.map((line) => (
                        <div
                            key={line.id}
                            className="animate-in fade-in slide-in-from-bottom-2 duration-300"
                        >
                            <p
                                style={{
                                    fontSize: `${fontSize}px`,
                                    lineHeight: 1.4,
                                    textShadow: transparentBg
                                        ? "0 2px 8px rgba(0,0,0,0.8), 0 0 2px rgba(0,0,0,0.9)"
                                        : "none",
                                }}
                            >
                                {getDisplayText(line)}
                            </p>
                        </div>
                    ))}

                    {/* Interim caption — faded */}
                    {interimData && (
                        <div className="animate-in fade-in duration-150">
                            <p
                                style={{
                                    fontSize: `${fontSize}px`,
                                    lineHeight: 1.4,
                                    opacity: 0.5,
                                    textShadow: transparentBg
                                        ? "0 2px 8px rgba(0,0,0,0.8), 0 0 2px rgba(0,0,0,0.9)"
                                        : "none",
                                }}
                            >
                                {selectedLanguage && interimData.translations[selectedLanguage]
                                    ? interimData.translations[selectedLanguage]
                                    : interimData.text}
                            </p>
                        </div>
                    )}

                    <div ref={scrollRef} />
                </div>
            </div>

            {/* Connection status indicator — only visible in non-transparent mode */}
            {!transparentBg && (
                <div className="px-4 py-2 flex items-center gap-2 text-xs opacity-50">
                    <span
                        className={`w-2 h-2 rounded-full ${connected ? "bg-emerald-400 animate-pulse" : "bg-zinc-500"
                            }`}
                    />
                    <span>{connected ? "Connected" : "Connecting..."}</span>
                </div>
            )}
        </div>
    );
}

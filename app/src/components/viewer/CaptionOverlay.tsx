"use client";

import { useEffect, useRef, useCallback } from "react";
import { useCaptionStream, captionDisplayText, type CaptionStreamLine } from "@/hooks/useCaptionStream";
import { Display } from "@/types";

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
    const { lines, interim: interimData, connected } = useCaptionStream(sessionId, { clearOnComplete: true });
    const scrollRef = useRef<HTMLDivElement>(null);

    // Auto-scroll to bottom when new captions arrive
    useEffect(() => {
        scrollRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }, [lines, interimData]);

    const getDisplayText = useCallback(
        (line: CaptionStreamLine) => captionDisplayText(line, selectedLanguage),
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

"use client";

import { useEffect, useState } from "react";
import { getPusherClient, getSessionChannel, CAPTION_EVENT, STATUS_EVENT } from "@/lib/pusher-client";

export interface CaptionStreamLine {
    id: string;
    text: string;
    sourceLanguage: string;
    translations: Record<string, string>;
    timestamp: number;
}

export interface InterimCaption {
    text: string;
    translations: Record<string, string>;
}

interface CaptionEventData {
    text: string;
    sourceLanguage: string;
    translations: Record<string, string>;
    isFinal: boolean;
    timestamp: number;
}

const MAX_LINES = 50; // Keep last 50 lines to avoid memory issues on phones

/**
 * Subscribe to a session's live caption stream over Pusher.
 *
 * Stores the full translations map per line so the consumer can switch
 * display language at render time (retroactively, without resubscribing).
 * `clearOnComplete` empties the transcript when the broadcaster ends the
 * session (used by OBS-style overlay displays).
 */
export function useCaptionStream(sessionId: string | null, opts?: { clearOnComplete?: boolean }) {
    const clearOnComplete = opts?.clearOnComplete ?? false;

    const [lines, setLines] = useState<CaptionStreamLine[]>([]);
    const [interim, setInterim] = useState<InterimCaption | null>(null);
    const [connected, setConnected] = useState(false);
    const [sessionStatus, setSessionStatus] = useState("live");
    const [discoveredLanguages, setDiscoveredLanguages] = useState<string[]>([]);

    useEffect(() => {
        if (!sessionId) return;

        const pusher = getPusherClient();
        const channel = pusher.subscribe(getSessionChannel(sessionId));

        setConnected(true);
        channel.bind("pusher:subscription_succeeded", () => setConnected(true));

        channel.bind(CAPTION_EVENT, (data: CaptionEventData) => {
            if (data.translations && Object.keys(data.translations).length > 0) {
                setDiscoveredLanguages((prev) =>
                    Array.from(new Set([...prev, ...Object.keys(data.translations)]))
                );
            }

            if (data.isFinal) {
                setLines((prev) => [
                    ...prev.slice(-(MAX_LINES - 1)),
                    {
                        id: `line-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
                        text: data.text,
                        sourceLanguage: data.sourceLanguage,
                        translations: data.translations ?? {},
                        timestamp: data.timestamp,
                    },
                ]);
                setInterim(null);
            } else {
                setInterim({ text: data.text, translations: data.translations ?? {} });
            }
        });

        channel.bind(STATUS_EVENT, (data: { status: string }) => {
            if (!data.status) return;
            setSessionStatus(data.status);
            if (clearOnComplete && data.status === "completed") {
                setLines([]);
                setInterim(null);
            }
        });

        return () => {
            channel.unbind_all();
            pusher.unsubscribe(getSessionChannel(sessionId));
            setConnected(false);
        };
    }, [sessionId, clearOnComplete]);

    return { lines, interim, connected, sessionStatus, setSessionStatus, discoveredLanguages };
}

/** Resolve the text to show for a line given the viewer's selected language. */
export function captionDisplayText(
    line: { text: string; translations: Record<string, string> },
    selectedLanguage: string | null
): string {
    if (selectedLanguage && line.translations[selectedLanguage]) {
        return line.translations[selectedLanguage];
    }
    return line.text;
}

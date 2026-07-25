/**
 * CaptionPipeline — Client-side service that manages the entire
 * Audio Capture → Deepgram STT → Broadcast pipeline.
 *
 * Usage:
 *   const pipeline = new CaptionPipeline({ sessionId, sourceLanguage, targetLanguages, onTranscript });
 *   await pipeline.start();
 *   // ... later
 *   pipeline.stop();
 */


export interface TranscriptEvent {
    text: string;
    isFinal: boolean;
    translations: Record<string, string>;
    timestamp: number;
}

export interface CaptionPipelineOptions {
    sessionId: string;
    sourceLanguage: string;
    targetLanguages: string[];
    keywords?: string[];        // Deepgram keyword boosting
    profanityFilter?: boolean;  // Deepgram profanity_filter
    punctuation?: boolean;      // Deepgram punctuate
    deviceId?: string;          // Specific microphone/audio input device ID
    onTranscript: (event: TranscriptEvent) => void;
    onStatusChange?: (status: PipelineStatus) => void;
    onError?: (error: string) => void;
}

export type PipelineStatus = "idle" | "connecting" | "listening" | "error" | "stopped";

export class CaptionPipeline {
    private options: CaptionPipelineOptions;
    private mediaStream: MediaStream | null = null;
    private mediaRecorder: MediaRecorder | null = null;
    private dgSocket: WebSocket | null = null;
    private status: PipelineStatus = "idle";
    private broadcastDebounceTimer: ReturnType<typeof setTimeout> | null = null;
    private interimText = "";

    constructor(options: CaptionPipelineOptions) {
        this.options = options;
    }

    private setStatus(status: PipelineStatus) {
        this.status = status;
        this.options.onStatusChange?.(status);
    }

    getStatus() {
        return this.status;
    }

    /**
     * Start the full audio capture + STT pipeline.
     */
    async start() {
        try {
            this.setStatus("connecting");

            // 1. Get microphone access
            this.mediaStream = await navigator.mediaDevices.getUserMedia({
                audio: {
                    echoCancellation: true,
                    noiseSuppression: true,
                    sampleRate: 16000,
                    ...(this.options.deviceId ? { deviceId: { exact: this.options.deviceId } } : {})
                },
            });

            // 2. Get a short-lived Deepgram token from our secure endpoint,
            // authenticated with the caller's Firebase ID token.
            const { auth } = await import("@/lib/firebase");
            const user = auth.currentUser;
            if (!user) {
                throw new Error("User not authenticated");
            }
            const token = await user.getIdToken();
            const headers: Record<string, string> = {
                Authorization: `Bearer ${token}`,
            };

            const tokenRes = await fetch("/api/deepgram/token", { headers });
            const data = await tokenRes.json();

            // The endpoint returns a short-lived access token (`token`), not the
            // master key. `key` is kept as a fallback alias for older responses.
            const accessToken = data.token || data.key;
            if (!tokenRes.ok || !accessToken) {
                const errMsg = data.error || tokenRes.statusText || 'Unknown error';
                throw new Error(`Failed to retrieve Deepgram token: ${errMsg}`);
            }

            // 3. Open WebSocket to Deepgram
            const dgUrl = new URL("wss://api.deepgram.com/v1/listen");
            dgUrl.searchParams.set("model", "nova-2");
            dgUrl.searchParams.set("language", this.options.sourceLanguage);
            dgUrl.searchParams.set("smart_format", "true");
            dgUrl.searchParams.set("punctuate", this.options.punctuation !== false ? "true" : "false");
            dgUrl.searchParams.set("interim_results", "true");
            dgUrl.searchParams.set("endpointing", "300");

            // Apply profanity filter if enabled
            if (this.options.profanityFilter !== false) {
                dgUrl.searchParams.set("profanity_filter", "true");
            }

            // Apply keyword boosting if keywords are provided
            if (this.options.keywords && this.options.keywords.length > 0) {
                for (const kw of this.options.keywords) {
                    dgUrl.searchParams.append("keywords", kw);
                }
            }

            // Short-lived grant tokens authenticate via the "bearer" subprotocol
            // (the raw-key path would use ["token", key]).
            this.dgSocket = new WebSocket(dgUrl.toString(), ["bearer", accessToken]);

            this.dgSocket.onopen = () => {
                this.setStatus("listening");
                this.startRecording();
            };

            this.dgSocket.onmessage = (event) => {
                this.handleDeepgramMessage(event);
            };

            this.dgSocket.onerror = (err) => {
                console.error("Deepgram WebSocket error:", err);
                this.setStatus("error");
                this.options.onError?.("Deepgram connection failed");
            };

            this.dgSocket.onclose = () => {
                if (this.status === "listening") {
                    this.setStatus("stopped");
                }
            };
        } catch (err) {
            console.error("Pipeline start error:", err);
            this.setStatus("error");
            this.options.onError?.(
                err instanceof Error ? err.message : "Failed to start pipeline"
            );
        }
    }

    /**
     * Stop the pipeline — mic, recorder, WebSocket.
     */
    stop() {
        this.setStatus("stopped");

        if (this.broadcastDebounceTimer) {
            clearTimeout(this.broadcastDebounceTimer);
        }

        // Stop MediaRecorder
        if (this.mediaRecorder && this.mediaRecorder.state !== "inactive") {
            this.mediaRecorder.stop();
        }
        this.mediaRecorder = null;

        // Stop media tracks
        if (this.mediaStream) {
            this.mediaStream.getTracks().forEach((track) => track.stop());
            this.mediaStream = null;
        }

        // Close Deepgram WebSocket
        if (this.dgSocket && this.dgSocket.readyState === WebSocket.OPEN) {
            this.dgSocket.close();
        }
        this.dgSocket = null;
    }

    // ───────────────────────────────────── Private ─────────────────────────

    private startRecording() {
        if (!this.mediaStream) return;

        // Use webm/opus which Deepgram supports natively
        const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
            ? "audio/webm;codecs=opus"
            : "audio/webm";

        this.mediaRecorder = new MediaRecorder(this.mediaStream, { mimeType });

        this.mediaRecorder.ondataavailable = (event) => {
            if (
                event.data.size > 0 &&
                this.dgSocket &&
                this.dgSocket.readyState === WebSocket.OPEN
            ) {
                this.dgSocket.send(event.data);
            }
        };

        // Send audio chunks every 250ms for low latency
        this.mediaRecorder.start(250);
    }

    private handleDeepgramMessage(event: MessageEvent) {
        try {
            const data = JSON.parse(event.data);
            const transcript = data?.channel?.alternatives?.[0]?.transcript;

            if (!transcript) return;

            const isFinal = data.is_final === true;

            if (isFinal) {
                // Final transcript — broadcast immediately
                if (this.broadcastDebounceTimer) {
                    clearTimeout(this.broadcastDebounceTimer);
                    this.broadcastDebounceTimer = null;
                }
                this.interimText = "";
                this.broadcastTranscript(transcript, true);
            } else {
                // Interim — show locally but debounce broadcast
                this.interimText = transcript;
                this.options.onTranscript({
                    text: transcript,
                    isFinal: false,
                    translations: {},
                    timestamp: Date.now(),
                });

                if (this.broadcastDebounceTimer) {
                    clearTimeout(this.broadcastDebounceTimer);
                }
                this.broadcastDebounceTimer = setTimeout(() => {
                    if (this.interimText) {
                        this.broadcastTranscript(this.interimText, false);
                    }
                }, 1000);
            }
        } catch (err) {
            console.error("Error parsing Deepgram message:", err);
        }
    }

    private async broadcastTranscript(text: string, isFinal: boolean) {
        // Show it locally first
        this.options.onTranscript({
            text,
            isFinal,
            translations: {},
            timestamp: Date.now(),
        });

        // Fire to backend for translation + Pusher broadcast
        try {
            const headers: Record<string, string> = { "Content-Type": "application/json" };

            // The broadcast endpoint requires a Firebase ID token so only
            // authorized operators can inject captions into a session.
            const { auth } = await import("@/lib/firebase");
            const user = auth.currentUser;
            if (user) {
                headers["Authorization"] = `Bearer ${await user.getIdToken()}`;
            }

            const res = await fetch("/api/broadcast", {
                method: "POST",
                headers,
                body: JSON.stringify({
                    sessionId: this.options.sessionId,
                    text,
                    sourceLanguage: this.options.sourceLanguage,
                    targetLanguages: this.options.targetLanguages,
                    isFinal,
                }),
            });

            if (res.ok) {
                const data = await res.json();
                // If we got translations back, no need — Pusher will deliver them.
                // But if this client is also a viewer, onTranscript will be called
                // with translations via the Pusher subscription.
                void data;
            }
        } catch (err) {
            console.error("Broadcast API error:", err);
        }
    }
}

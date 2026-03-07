"use client";

import { QRCodeSVG } from "qrcode.react";
import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Copy, CheckCircle2, Smartphone, QrCode } from "lucide-react";

interface QRCodePanelProps {
    sessionId: string;
    organizationSlug?: string;
}

export default function QRCodePanel({ sessionId, organizationSlug }: QRCodePanelProps) {
    const [copied, setCopied] = useState(false);
    const [showQR, setShowQR] = useState(false);

    const joinUrl = typeof window !== "undefined"
        ? (organizationSlug
            ? `${window.location.origin}/live/${organizationSlug}`
            : `${window.location.origin}/join?session=${sessionId}`)
        : (organizationSlug
            ? `/live/${organizationSlug}`
            : `/join?session=${sessionId}`);

    const handleCopy = () => {
        navigator.clipboard.writeText(joinUrl);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <Card className="bg-violet-500/5 border-violet-500/20">
            <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-3">
                    <div className="w-8 h-8 rounded-lg bg-violet-500/10 border border-violet-500/20 flex items-center justify-center">
                        <Smartphone className="w-4 h-4 text-violet-400" />
                    </div>
                    <div>
                        <p className="text-sm font-medium text-violet-400">
                            {organizationSlug ? "Permanent Audience Link" : "Audience Translation"}
                        </p>
                        <p className="text-xs text-zinc-500">
                            {organizationSlug
                                ? "This link automatically redirects to your live broadcast"
                                : "Share with attendees to view on their phones"}
                        </p>
                    </div>
                </div>

                {/* QR Code toggle */}
                <button
                    onClick={() => setShowQR(!showQR)}
                    className="w-full mb-3 flex items-center justify-center gap-2 py-2 rounded-lg bg-zinc-900/50 border border-zinc-800/60 text-xs text-zinc-400 hover:text-white hover:border-zinc-700 transition-colors"
                >
                    <QrCode className="w-3.5 h-3.5" />
                    {showQR ? "Hide QR Code" : "Show QR Code"}
                </button>

                {/* QR Code */}
                {showQR && (
                    <div className="flex justify-center mb-3 p-4 bg-white rounded-xl">
                        <QRCodeSVG
                            value={joinUrl}
                            size={180}
                            level="M"
                            includeMargin={false}
                            bgColor="#ffffff"
                            fgColor="#18181b"
                        />
                    </div>
                )}

                {/* URL and copy */}
                <div className="flex items-center gap-2">
                    <code className="flex-1 text-xs bg-zinc-900/50 px-3 py-2 rounded-md border border-zinc-800 text-zinc-300 truncate">
                        {joinUrl}
                    </code>
                    <Button
                        size="icon"
                        variant="ghost"
                        className="text-zinc-400 hover:text-white shrink-0"
                        onClick={handleCopy}
                    >
                        {copied ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
}

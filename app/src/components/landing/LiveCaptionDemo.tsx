"use client";

import { useEffect, useState } from "react";
import { Radio } from "lucide-react";

/**
 * Hero centerpiece: a live preview of what CaptionFlow actually does.
 * A spoken line is "transcribed" character by character, then the same
 * sentence appears translated into three different scripts (Latin, CJK,
 * Arabic RTL). It mirrors the real /join viewer so the hero shows the
 * product instead of describing it.
 */

interface Row {
    lang: string;
    flag: string;
    text: string;
    rtl?: boolean;
}

const PHRASES: { src: string; rows: Row[] }[] = [
    {
        src: "Welcome. We're so glad you could join us this morning.",
        rows: [
            { lang: "Spanish", flag: "🇪🇸", text: "Bienvenidos. Nos alegra mucho que pudieran acompañarnos esta mañana." },
            { lang: "Chinese", flag: "🇨🇳", text: "欢迎。很高兴你们今天早上能来。" },
            { lang: "Arabic", flag: "🇸🇦", rtl: true, text: "أهلاً بكم. يسعدنا أنكم تمكنتم من الانضمام إلينا هذا الصباح." },
        ],
    },
    {
        src: "Today's talk is about hope, and the road ahead of us.",
        rows: [
            { lang: "Spanish", flag: "🇪🇸", text: "La charla de hoy trata sobre la esperanza y el camino que tenemos por delante." },
            { lang: "Chinese", flag: "🇨🇳", text: "今天的演讲是关于希望，以及我们前方的道路。" },
            { lang: "Arabic", flag: "🇸🇦", rtl: true, text: "حديث اليوم عن الأمل والطريق الذي ينتظرنا." },
        ],
    },
];

export default function LiveCaptionDemo() {
    const [phraseIndex, setPhraseIndex] = useState(0);
    const [charCount, setCharCount] = useState(0);
    const [revealed, setRevealed] = useState(0);
    const [reduced, setReduced] = useState(false);

    useEffect(() => {
        const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
        setReduced(mq.matches);
        const onChange = () => setReduced(mq.matches);
        mq.addEventListener("change", onChange);
        return () => mq.removeEventListener("change", onChange);
    }, []);

    useEffect(() => {
        const phrase = PHRASES[phraseIndex];

        // Reduced motion: show the fully populated state, no cycling.
        if (reduced) {
            setCharCount(phrase.src.length);
            setRevealed(phrase.rows.length);
            return;
        }

        setCharCount(0);
        setRevealed(0);
        const timers: ReturnType<typeof setTimeout>[] = [];
        let c = 0;

        const typing = setInterval(() => {
            c += 1;
            setCharCount(c);
            if (c >= phrase.src.length) {
                clearInterval(typing);
                phrase.rows.forEach((_, i) => {
                    timers.push(setTimeout(() => setRevealed(i + 1), 320 * (i + 1)));
                });
                const hold = 320 * phrase.rows.length + 3000;
                timers.push(
                    setTimeout(() => setPhraseIndex((p) => (p + 1) % PHRASES.length), hold)
                );
            }
        }, 32);

        return () => {
            clearInterval(typing);
            timers.forEach(clearTimeout);
        };
    }, [phraseIndex, reduced]);

    const phrase = PHRASES[phraseIndex];
    const typed = phrase.src.slice(0, charCount);
    const typingDone = charCount >= phrase.src.length;

    return (
        <div className="relative">
            {/* soft glow behind the panel */}
            <div
                aria-hidden
                className="absolute -inset-6 -z-10 rounded-[2rem] bg-blue-500/10 blur-2xl"
            />
            <div className="rounded-2xl border border-zinc-800 bg-zinc-900/70 backdrop-blur-xl shadow-2xl shadow-black/40 overflow-hidden">
                {/* header */}
                <div className="flex items-center justify-between border-b border-zinc-800/80 px-5 py-3.5">
                    <div className="flex items-center gap-2">
                        <span className="relative flex h-2 w-2">
                            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400/70" />
                            <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
                        </span>
                        <span className="text-sm font-medium text-zinc-200">Live captions</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-zinc-400">
                        <Radio className="h-3.5 w-3.5" />
                        Sunday service
                    </div>
                </div>

                {/* spoken (source) line */}
                <div className="px-5 pt-5">
                    <p className="mb-1.5 text-xs font-medium uppercase tracking-wide text-zinc-500">
                        Spoken · English
                    </p>
                    <p className="min-h-[3.5rem] text-lg font-medium leading-snug text-white sm:text-xl">
                        {typed}
                        {!typingDone && (
                            <span className="ml-0.5 inline-block h-5 w-0.5 -translate-y-0.5 animate-pulse bg-blue-400 align-middle" />
                        )}
                    </p>
                </div>

                {/* translations */}
                <div className="space-y-px px-5 pb-5 pt-3">
                    {phrase.rows.map((row, i) => (
                        <div
                            key={row.lang}
                            dir={row.rtl ? "rtl" : "ltr"}
                            className={`rounded-lg px-3 py-2.5 transition-all duration-500 ${
                                i < revealed
                                    ? "translate-y-0 bg-zinc-800/40 opacity-100"
                                    : "pointer-events-none translate-y-1 opacity-0"
                            }`}
                        >
                            <div className="mb-0.5 flex items-center gap-1.5">
                                <span className="text-sm" aria-hidden>{row.flag}</span>
                                <span className="text-xs font-medium text-zinc-400">{row.lang}</span>
                            </div>
                            <p className="text-[15px] leading-snug text-zinc-100">{row.text}</p>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}

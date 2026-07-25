"use client";

import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { isDemo } from "@/lib/demo";
import { Button } from "@/components/ui/button";
import LiveCaptionDemo from "@/components/landing/LiveCaptionDemo";
import {
    Captions,
    Mic,
    Languages,
    QrCode,
    Church,
    Presentation,
    Accessibility,
    ArrowRight,
    Check,
} from "lucide-react";

const LANGUAGES = [
    { flag: "🇺🇸", name: "English" }, { flag: "🇪🇸", name: "Español" }, { flag: "🇫🇷", name: "Français" },
    { flag: "🇩🇪", name: "Deutsch" }, { flag: "🇧🇷", name: "Português" }, { flag: "🇨🇳", name: "中文" },
    { flag: "🇯🇵", name: "日本語" }, { flag: "🇰🇷", name: "한국어" }, { flag: "🇸🇦", name: "العربية" },
    { flag: "🇮🇳", name: "हिन्दी" }, { flag: "🇷🇺", name: "Русский" }, { flag: "🇮🇹", name: "Italiano" },
    { flag: "🇳🇱", name: "Nederlands" }, { flag: "🇹🇷", name: "Türkçe" }, { flag: "🇻🇳", name: "Tiếng Việt" },
    { flag: "🇹🇭", name: "ไทย" }, { flag: "🇵🇱", name: "Polski" }, { flag: "🇺🇦", name: "Українська" },
    { flag: "🇰🇪", name: "Kiswahili" }, { flag: "🇵🇭", name: "Filipino" },
];

const STEPS = [
    {
        icon: Mic,
        title: "Start a session",
        body: "Open CaptionFlow, choose the spoken language and the languages your audience needs. No hardware to set up.",
    },
    {
        icon: Languages,
        title: "We caption and translate",
        body: "Your speaker's words are transcribed and translated as they talk. No one types, no volunteer falls behind.",
    },
    {
        icon: QrCode,
        title: "Everyone scans and reads",
        body: "Attendees scan one QR code and read along live on their own phones, each in the language they picked.",
    },
];

const USE_CASES = [
    {
        icon: Church,
        title: "Churches and worship",
        body: "Welcome multilingual congregations and members who are deaf or hard of hearing. Captions reach every seat without renting equipment.",
    },
    {
        icon: Presentation,
        title: "Conferences and events",
        body: "Give international attendees a live translation of every talk, and a clear caption to follow when the room gets loud.",
    },
    {
        icon: Accessibility,
        title: "Accessibility first",
        body: "Meet ADA and WCAG expectations with accurate live captions people read on the device already in their pocket.",
    },
];

export default function HomePage() {
    const { user } = useAuth();

    // Primary CTA adapts to context: demo launches the workspace, signed-in
    // users go to their dashboard, everyone else starts a free account.
    const primaryHref = isDemo ? "/dashboard" : user ? "/dashboard" : "/register";
    const primaryLabel = isDemo ? "Open the demo" : user ? "Go to dashboard" : "Get started free";

    return (
        <div className="min-h-screen bg-zinc-950 text-white">
            {/* ── Nav ───────────────────────────────────────── */}
            <header className="sticky top-0 z-40 border-b border-zinc-800/70 bg-zinc-950/80 backdrop-blur-xl">
                <nav className="mx-auto flex max-w-6xl items-center justify-between px-5 py-3.5">
                    <Link href="/" className="flex items-center gap-2">
                        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-500/15 text-blue-400">
                            <Captions className="h-5 w-5" />
                        </span>
                        <span className="text-base font-semibold tracking-tight">CaptionFlow</span>
                    </Link>

                    <div className="hidden items-center gap-8 text-sm text-zinc-400 md:flex">
                        <a href="#how" className="transition-colors hover:text-white">How it works</a>
                        <a href="#use-cases" className="transition-colors hover:text-white">Use cases</a>
                        <a href="#languages" className="transition-colors hover:text-white">Languages</a>
                    </div>

                    <div className="flex items-center gap-2">
                        {!isDemo && !user && (
                            <Link href="/login" className="hidden sm:block">
                                <Button variant="ghost" size="sm" className="text-zinc-300 hover:text-white">
                                    Sign in
                                </Button>
                            </Link>
                        )}
                        <Link href={primaryHref}>
                            <Button size="sm" className="bg-blue-500 text-white hover:bg-blue-400">
                                {primaryLabel}
                            </Button>
                        </Link>
                    </div>
                </nav>
            </header>

            {/* ── Hero ──────────────────────────────────────── */}
            <section className="relative overflow-hidden">
                {/* ambient blue glow */}
                <div
                    aria-hidden
                    className="pointer-events-none absolute inset-x-0 top-[-10%] -z-10 mx-auto h-[480px] max-w-4xl rounded-full bg-blue-600/15 blur-[120px]"
                />
                <div className="mx-auto grid max-w-6xl items-center gap-14 px-5 py-16 lg:grid-cols-2 lg:py-24">
                    <div className="animate-in fade-in slide-in-from-bottom-3 duration-700">
                        <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-zinc-800 bg-zinc-900/60 px-3 py-1 text-xs text-zinc-400">
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                            Real-time captions and translation
                        </div>
                        <h1 className="text-balance text-4xl font-semibold leading-[1.05] tracking-tight sm:text-5xl lg:text-6xl">
                            Everyone follows along, in the language they read.
                        </h1>
                        <p className="mt-5 max-w-xl text-pretty text-lg leading-relaxed text-zinc-400">
                            CaptionFlow turns a live speaker into instant captions and translations on
                            every phone in the room. Made for churches, conferences, and anyone who
                            needs to read what is being said.
                        </p>
                        <div className="mt-8 flex flex-wrap items-center gap-3">
                            <Link href={primaryHref}>
                                <Button size="lg" className="bg-blue-500 px-6 text-white hover:bg-blue-400">
                                    {primaryLabel}
                                    <ArrowRight className="h-4 w-4" />
                                </Button>
                            </Link>
                            <a href="https://demo.caption-flow.com" target="_blank" rel="noopener noreferrer">
                                <Button size="lg" variant="outline" className="border-zinc-700 bg-transparent px-6 text-zinc-200 hover:bg-zinc-900 hover:text-white">
                                    Try the live demo
                                </Button>
                            </a>
                        </div>
                        <p className="mt-4 flex items-center gap-2 text-sm text-zinc-500">
                            <Check className="h-4 w-4 text-emerald-400" />
                            Free to start. No app for your audience to install.
                        </p>
                    </div>

                    <div className="animate-in fade-in slide-in-from-bottom-4 duration-1000 lg:pl-4">
                        <LiveCaptionDemo />
                    </div>
                </div>
            </section>

            {/* ── How it works ──────────────────────────────── */}
            <section id="how" className="border-t border-zinc-900 bg-zinc-950 py-20 lg:py-28">
                <div className="mx-auto max-w-6xl px-5">
                    <h2 className="max-w-2xl text-balance text-3xl font-semibold tracking-tight sm:text-4xl">
                        From spoken word to every phone in three steps.
                    </h2>
                    <div className="mt-14 grid gap-12 md:grid-cols-3">
                        {STEPS.map((step, i) => (
                            <div key={step.title} className="relative">
                                <div className="mb-5 flex items-center gap-3">
                                    <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/15 text-blue-400">
                                        <step.icon className="h-5 w-5" />
                                    </span>
                                    <span className="font-mono text-sm text-zinc-600">
                                        0{i + 1}
                                    </span>
                                </div>
                                <h3 className="mb-2 text-lg font-semibold text-white">{step.title}</h3>
                                <p className="text-pretty leading-relaxed text-zinc-400">{step.body}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ── Use cases ─────────────────────────────────── */}
            <section id="use-cases" className="border-t border-zinc-900 bg-gradient-to-b from-zinc-900/40 to-zinc-950 py-20 lg:py-28">
                <div className="mx-auto max-w-6xl px-5">
                    <h2 className="max-w-2xl text-balance text-3xl font-semibold tracking-tight sm:text-4xl">
                        Built for rooms where not everyone hears the same way.
                    </h2>
                    <div className="mt-14 grid gap-x-10 gap-y-12 sm:grid-cols-2 lg:grid-cols-3">
                        {USE_CASES.map((uc) => (
                            <div key={uc.title} className="border-t border-zinc-800 pt-6">
                                <uc.icon className="mb-4 h-6 w-6 text-blue-400" />
                                <h3 className="mb-2 text-lg font-semibold text-white">{uc.title}</h3>
                                <p className="text-pretty leading-relaxed text-zinc-400">{uc.body}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ── Languages ─────────────────────────────────── */}
            <section id="languages" className="border-t border-zinc-900 py-20 lg:py-28">
                <div className="mx-auto max-w-6xl px-5">
                    <div className="grid items-center gap-10 lg:grid-cols-[1fr_1.4fr]">
                        <div>
                            <h2 className="text-balance text-3xl font-semibold tracking-tight sm:text-4xl">
                                Twenty languages, ready the moment you go live.
                            </h2>
                            <p className="mt-4 max-w-md text-pretty leading-relaxed text-zinc-400">
                                Each attendee picks their own language on their phone. You speak once,
                                and everyone reads in the words that feel like home.
                            </p>
                        </div>
                        <div className="flex flex-wrap gap-2.5">
                            {LANGUAGES.map((lang) => (
                                <span
                                    key={lang.name}
                                    className="inline-flex items-center gap-2 rounded-full border border-zinc-800 bg-zinc-900/60 px-3.5 py-1.5 text-sm text-zinc-300"
                                >
                                    <span aria-hidden>{lang.flag}</span>
                                    {lang.name}
                                </span>
                            ))}
                        </div>
                    </div>
                </div>
            </section>

            {/* ── Closing CTA ───────────────────────────────── */}
            <section className="border-t border-zinc-900 py-20 lg:py-28">
                <div className="relative mx-auto max-w-4xl overflow-hidden rounded-3xl border border-zinc-800 bg-zinc-900/50 px-6 py-16 text-center">
                    <div
                        aria-hidden
                        className="pointer-events-none absolute inset-x-0 top-0 -z-10 mx-auto h-64 max-w-2xl rounded-full bg-blue-600/20 blur-[100px]"
                    />
                    <h2 className="mx-auto max-w-2xl text-balance text-3xl font-semibold tracking-tight sm:text-4xl">
                        Bring everyone into the conversation.
                    </h2>
                    <p className="mx-auto mt-4 max-w-lg text-pretty leading-relaxed text-zinc-400">
                        Set up your first captioned session in a few minutes. Your audience just scans
                        and reads.
                    </p>
                    <div className="mt-8 flex justify-center">
                        <Link href={primaryHref}>
                            <Button size="lg" className="bg-blue-500 px-7 text-white hover:bg-blue-400">
                                {primaryLabel}
                                <ArrowRight className="h-4 w-4" />
                            </Button>
                        </Link>
                    </div>
                </div>
            </section>

            {/* ── Footer ────────────────────────────────────── */}
            <footer className="border-t border-zinc-900 py-10">
                <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-5 sm:flex-row">
                    <div className="flex items-center gap-2 text-zinc-400">
                        <Captions className="h-4 w-4 text-blue-400" />
                        <span className="text-sm">CaptionFlow</span>
                    </div>
                    <div className="flex items-center gap-6 text-sm text-zinc-500">
                        <a href="#how" className="transition-colors hover:text-zinc-300">How it works</a>
                        <a href="#use-cases" className="transition-colors hover:text-zinc-300">Use cases</a>
                        {!isDemo && (
                            <Link href="/login" className="transition-colors hover:text-zinc-300">Sign in</Link>
                        )}
                    </div>
                    <p className="text-sm text-zinc-500">© 2026 CaptionFlow</p>
                </div>
            </footer>
        </div>
    );
}

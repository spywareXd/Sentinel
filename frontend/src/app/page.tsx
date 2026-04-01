import Link from "next/link";
import {
  Shield,
  Lock,
  Zap,
  Globe,
  MessageCircle,
  Code,
  ChevronRight,
  Server,
} from "lucide-react";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background text-on-surface font-body selection:bg-primary-container">
      {/* ── Navbar ── */}
      <nav className="fixed top-0 w-full z-50 bg-[#020305]/60 backdrop-blur-xl border-b border-white/[0.03]">
        <div className="flex justify-between items-center px-8 py-4 max-w-7xl mx-auto">
          <div className="flex items-center gap-8">
            <Link href="/" className="flex items-center gap-2">
              <Shield className="w-6 h-6 text-primary" />
              <span className="text-2xl font-extrabold tracking-tight text-primary font-headline">
                Sentinel
              </span>
            </Link>
            <div className="hidden md:flex gap-6">
              <a
                href="#features"
                className="text-on-surface-variant hover:text-on-surface transition-colors text-sm font-medium"
              >
                Features
              </a>
              <a
                href="#security"
                className="text-on-surface-variant hover:text-on-surface transition-colors text-sm font-medium"
              >
                Security
              </a>
              <a
                href="#governance"
                className="text-on-surface-variant hover:text-on-surface transition-colors text-sm font-medium"
              >
                Governance
              </a>
              <Link
                href="/cases"
                className="text-on-surface-variant hover:text-on-surface transition-colors text-sm font-medium"
              >
                Cases
              </Link>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="px-5 py-2 text-on-surface-variant hover:text-on-surface transition-all font-medium text-sm"
            >
              Login
            </Link>
            <Link
              href="/register"
              className="px-6 py-2.5 bg-primary text-[#0a0c14] rounded-full font-bold text-sm hover:bg-[#d0d1ff] transition-all shadow-[0_0_20px_rgba(192,193,255,0.15)]"
            >
              Sign Up
            </Link>
          </div>
        </div>
      </nav>

      <main className="relative pt-24 overflow-hidden">
        {/* ── Hero Section ── */}
        <section className="relative min-h-[90vh] flex flex-col items-center justify-center px-6 text-center">
          {/* Background Glow */}
          <div className="absolute inset-0 -z-10">
            <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[800px] h-[800px] bg-[rgba(192,193,255,0.06)] rounded-full blur-[120px]" />
            <div className="absolute bottom-0 right-0 w-[500px] h-[500px] bg-[rgba(123,208,255,0.04)] rounded-full blur-[100px]" />
          </div>

          {/* Shield Emblem */}
          <div className="relative mb-12 drop-shadow-[0_0_30px_rgba(192,193,255,0.3)] group cursor-pointer hover:scale-105 transition-all duration-700">
            <div className="w-48 h-48 md:w-64 md:h-64 rounded-[2rem] bg-surface-container-high border border-outline-variant/20 flex items-center justify-center backdrop-blur-xl bg-[rgba(45,52,73,0.4)] rotate-12 group-hover:rotate-[8deg] transition-all duration-700 shadow-2xl">
              <div className="w-full h-full p-8 flex items-center justify-center -rotate-12 group-hover:-rotate-[8deg] transition-all duration-700">
                <span 
                  className="material-symbols-outlined text-8xl md:text-[120px] text-primary group-hover:text-primary-container group-hover:drop-shadow-[0_0_40px_rgba(192,193,255,0.8)] transition-all duration-500" 
                  style={{ fontVariationSettings: "'FILL' 1" }}
                >
                  shield_with_heart
                </span>
              </div>
            </div>
            {/* Energy Orbits */}
            <div className="absolute inset-0 border-2 border-secondary/30 rounded-full scale-125 animate-pulse group-hover:scale-[1.15] group-hover:border-secondary/70 transition-all duration-700" />
            <div className="absolute inset-0 border-[1px] border-primary/20 rounded-full scale-150 opacity-30 group-hover:scale-125 group-hover:border-primary/50 group-hover:opacity-100 transition-all duration-700" />
            <div className="absolute inset-0 border border-tertiary/20 rounded-full scale-[1.75] opacity-0 group-hover:animate-spin group-hover:opacity-30 transition-all duration-1000 border-dashed" />
          </div>

          {/* Hero Text */}
          <div className="max-w-4xl mx-auto z-10">
            <h1 className="font-headline text-5xl md:text-7xl font-extrabold tracking-tight mb-6 text-on-surface leading-tight">
              The Shield of Your <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-primary-container">
                Digital Life
              </span>
            </h1>
            <p className="text-lg md:text-xl text-on-surface-variant max-w-2xl mx-auto mb-10 leading-relaxed">
              A community-governed chat platform where safety is built-in, not
              added on. Secure communications meets decentralized trust.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href="/register"
                className="bg-gradient-to-r from-primary to-primary-container px-8 py-4 rounded-full text-[#0a0c14] font-bold text-lg hover:shadow-[0_0_30px_rgba(192,193,255,0.4)] transition-all"
              >
                Join the Sentinel
              </Link>
              <a
                href="#features"
                className="bg-surface-container-highest px-8 py-4 rounded-full text-on-surface font-bold text-lg hover:bg-surface-bright transition-all"
              >
                Learn More
              </a>
            </div>
          </div>

          {/* Stats Bar */}
          <div className="mt-24 grid grid-cols-2 md:grid-cols-4 gap-4 w-full max-w-5xl">
            <div className="p-6 bg-surface-container-low rounded-xl border-l-2 border-primary/30">
              <span className="block font-headline text-2xl font-bold text-primary mb-1">
                99.9%
              </span>
              <span className="text-xs text-on-surface-variant uppercase tracking-widest font-bold">
                Uptime Secured
              </span>
            </div>
            <div className="p-6 bg-surface-container-low rounded-xl border-l-2 border-secondary/30">
              <span className="block font-headline text-2xl font-bold text-secondary mb-1">
                E2EE
              </span>
              <span className="text-xs text-on-surface-variant uppercase tracking-widest font-bold">
                Standard Protocol
              </span>
            </div>
            <div className="p-6 bg-surface-container-low rounded-xl border-l-2 border-tertiary/30">
              <span className="block font-headline text-2xl font-bold text-tertiary mb-1">
                DAO
              </span>
              <span className="text-xs text-on-surface-variant uppercase tracking-widest font-bold">
                Managed Assets
              </span>
            </div>
            <div className="p-6 bg-surface-container-low rounded-xl border-l-2 border-primary/30">
              <span className="block font-headline text-2xl font-bold text-primary mb-1">
                Open
              </span>
              <span className="text-xs text-on-surface-variant uppercase tracking-widest font-bold">
                Source Core
              </span>
            </div>
          </div>
        </section>

        {/* ── Feature Bento Grid ── */}
        <section id="features" className="py-24 px-8 max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
            {/* Governance Large Card */}
            <div
              id="governance"
              className="md:col-span-8 bg-surface-container rounded-3xl overflow-hidden relative group min-h-[320px]"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-secondary/5 transition-opacity duration-700 group-hover:opacity-80 opacity-40" />
              <div className="absolute inset-0 bg-gradient-to-t from-surface-container via-surface-container/40 to-transparent" />
              <div className="relative p-10 h-full flex flex-col justify-end">
                <h3 className="font-headline text-3xl font-bold mb-4 text-primary">
                  Decentralized Governance
                </h3>
                <p className="text-on-surface-variant text-lg max-w-md">
                  Every major feature update is voted on by the Sentinel
                  community. You aren&apos;t just a user; you&apos;re a
                  stakeholder.
                </p>
              </div>
            </div>

            {/* Zero Knowledge Card */}
            <div
              id="security"
              className="md:col-span-4 bg-surface-container-high rounded-3xl p-8 flex flex-col justify-between gap-8"
            >
              <div className="w-12 h-12 bg-secondary/20 rounded-lg flex items-center justify-center">
                <Lock className="w-5 h-5 text-secondary" />
              </div>
              <div>
                <h3 className="font-headline text-xl font-bold mb-2">
                  Zero-Knowledge
                </h3>
                <p className="text-on-surface-variant text-sm">
                  We never store your metadata. What happens in the Sentinel
                  stays in the Sentinel.
                </p>
              </div>
            </div>

            {/* Instant Sync Card */}
            <div className="md:col-span-4 bg-surface-container-high rounded-3xl p-8 flex flex-col justify-between gap-8">
              <div className="w-12 h-12 bg-tertiary/20 rounded-lg flex items-center justify-center">
                <Zap className="w-5 h-5 text-tertiary" />
              </div>
              <div>
                <h3 className="font-headline text-xl font-bold mb-2">
                  Instant Sync
                </h3>
                <p className="text-on-surface-variant text-sm">
                  Blazing fast message delivery across all your devices using
                  distributed relay nodes.
                </p>
              </div>
            </div>

            {/* Hardware Isolation Card */}
            <div className="md:col-span-8 bg-surface-container-low rounded-3xl p-1 shadow-inner relative group overflow-hidden">
              <div className="bg-surface rounded-[22px] p-8 h-full flex items-center gap-8">
                <div className="hidden sm:block shrink-0">
                  <div className="w-32 h-32 rounded-2xl bg-surface-container-high flex items-center justify-center">
                    <Server className="w-12 h-12 text-on-surface-variant" />
                  </div>
                </div>
                <div>
                  <h3 className="font-headline text-2xl font-bold mb-3 text-on-surface">
                    Hardware Isolation
                  </h3>
                  <p className="text-on-surface-variant">
                    Secure your identity with physical hardware keys. Sentinel
                    supports all major security standards for enterprise-grade
                    protection.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── CTA Section ── */}
        <section className="py-32 px-8 text-center relative">
          <div className="absolute inset-0 bg-primary/5 -skew-y-3 -z-10" />
          <h2 className="font-headline text-4xl md:text-5xl font-extrabold mb-6">
            Ready to secure your future?
          </h2>
          <p className="text-on-surface-variant text-lg mb-10 max-w-xl mx-auto">
            Join thousands of early adopters and help shape the next generation
            of private communication.
          </p>
          <Link
            href="/register"
            className="inline-flex items-center gap-2 bg-on-surface text-surface px-10 py-5 rounded-full font-extrabold tracking-tight text-xl hover:scale-105 transition-transform active:scale-95"
          >
            ENTER THE SENTINEL
            <ChevronRight className="w-5 h-5" />
          </Link>
        </section>
      </main>

      {/* ── Footer ── */}
      <footer className="bg-[#020305] w-full py-12 border-t border-white/[0.03] mt-20">
        <div className="flex flex-col md:flex-row justify-between items-center px-12 max-w-7xl mx-auto gap-8">
          <div className="flex flex-col items-center md:items-start gap-2">
            <span className="font-headline font-bold text-on-surface text-xl tracking-tight">
              Sentinel
            </span>
            <span className="text-sm text-on-surface-variant/50">
              © 2025 Sentinel. Community Governed.
            </span>
          </div>
          <div className="flex gap-8">
            <a
              href="#"
              className="text-on-surface-variant/50 hover:text-primary transition-colors text-sm"
            >
              Whitepaper
            </a>
            <a
              href="#"
              className="text-on-surface-variant/50 hover:text-primary transition-colors text-sm"
            >
              Privacy
            </a>
            <a
              href="#"
              className="text-on-surface-variant/50 hover:text-primary transition-colors text-sm"
            >
              Terms
            </a>
            <a
              href="#"
              className="text-primary hover:text-primary/80 transition-colors text-sm font-bold"
            >
              DAO Status
            </a>
          </div>
          <div className="flex gap-4">
            <Globe className="w-5 h-5 text-on-surface-variant/50 hover:text-primary transition-all cursor-pointer" />
            <MessageCircle className="w-5 h-5 text-on-surface-variant/50 hover:text-primary transition-all cursor-pointer" />
            <Code className="w-5 h-5 text-on-surface-variant/50 hover:text-primary transition-all cursor-pointer" />
          </div>
        </div>
      </footer>
    </div>
  );
}

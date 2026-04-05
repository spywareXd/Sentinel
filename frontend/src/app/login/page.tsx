'use client';

export const dynamic = 'force-dynamic';

import Link from 'next/link';
import { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Shield, QrCode, UserRound, Wallet } from 'lucide-react';
import { login } from '@/app/actions/auth';
import { useAuth } from '@/hooks/use-auth';

function LoginContent() {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const { refreshSession } = useAuth();

  const message = searchParams.get('message');
  const redirectTo = searchParams.get('redirectTo') || '/chat';

  const handleSubmit = async (formData: FormData) => {
    setLoading(true);
    setError(null);

    const result = await login(formData);

    if (result?.error) {
      setError(result.error);
      setLoading(false);
      return;
    }

    await refreshSession();
    router.replace(redirectTo);
  };

  return (
    <>
      {message && (
        <div className="mb-4 rounded-xl border border-outline-variant/30 bg-surface-container-high p-3 text-center text-sm text-primary">
          {message}
        </div>
      )}

      {error && (
        <div className="mb-4 rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-center text-sm text-red-400">
          {error}
        </div>
      )}

      <form className="space-y-5" action={handleSubmit}>
        <div className="space-y-1.5">
          <label className="ml-1 block text-[11px] font-bold uppercase tracking-widest text-[var(--on-surface-variant)]">Email or Username</label>
          <input
            type="text"
            name="identifier"
            placeholder="name@example.com or username"
            required
            className="w-full rounded-xl border border-outline-variant/20 bg-white px-4 py-3.5 text-[15px] text-[#05070a] placeholder:text-[#05070a]/40 transition-all focus:border-[#a3a5fa] focus:outline-none focus:ring-1 focus:ring-[#a3a5fa]"
          />
        </div>

        <div className="space-y-1.5">
          <div className="ml-1 flex items-center justify-between pr-1">
            <label className="block text-[11px] font-bold uppercase tracking-widest text-[var(--on-surface-variant)]">Password</label>
            <Link prefetch={false} href="/forgot-password" className="text-[11px] font-semibold text-primary/80 transition-colors hover:text-primary">
              Forgot password?
            </Link>
          </div>
          <input
            type="password"
            name="password"
            placeholder="********"
            required
            className="w-full rounded-xl border border-outline-variant/20 bg-white px-4 py-3.5 text-sm tracking-widest text-[#05070a] placeholder:text-[#05070a]/40 transition-all focus:border-[#a3a5fa] focus:outline-none focus:ring-1 focus:ring-[#a3a5fa]"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="mt-8 w-full rounded-xl bg-[#a3a5fa] py-3.5 text-[15px] font-bold text-[#0a0c14] shadow-[0_0_20px_rgba(163,165,250,0.15)] transition-all hover:bg-[#b5b7fa] hover:shadow-[0_0_25px_rgba(163,165,250,0.3)] disabled:opacity-70 font-headline"
        >
          {loading ? 'Signing in...' : 'Log In'}
        </button>
      </form>

      <div className="mt-8 w-full">
        <div className="relative mb-6 flex items-center justify-center gap-4">
          <div className="h-[1px] flex-1 bg-outline-variant/30"></div>
          <span className="px-1 text-[10px] font-bold uppercase tracking-widest text-on-surface-variant/60">Or continue with</span>
          <div className="h-[1px] flex-1 bg-outline-variant/30"></div>
        </div>

        <button type="button" className="mb-6 flex w-full items-center justify-center gap-2 rounded-xl border border-outline-variant/20 bg-surface-container-lowest py-3.5 text-[15px] font-bold text-on-surface shadow-sm transition-all hover:bg-surface-bright/50">
          <Wallet className="h-5 w-5 text-primary" />
          Connect MetaMask
        </button>
      </div>

      <div className="border-t border-outline-variant/20 pt-6 text-center text-[14px]">
        <span className="text-on-surface-variant">New to Sentinel?</span>{' '}
        <Link href="/register" className="font-bold text-primary hover:underline">
          Create account
        </Link>
      </div>
    </>
  );
}

export default function Login() {
  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-background p-4 font-body text-on-surface">
      <div className="pointer-events-none absolute top-0 left-0 -z-10 flex h-full w-full items-center justify-center overflow-hidden">
        <div className="absolute h-[150%] w-[150%] bg-[radial-gradient(circle_at_center,rgba(163,165,250,0.06)_0%,rgba(5,7,10,0)_60%)]"></div>
      </div>

      <div className="relative my-10 flex w-full max-w-md flex-col items-center">
        <Link href="/" className="mb-8 flex flex-col items-center transition-transform hover:scale-105">
          <div className="mb-4 rounded-[1.2rem] bg-[#a3a5fa] p-3 text-[#0a0c14] shadow-[0_0_30px_rgba(163,165,250,0.2)]">
            <Shield className="h-8 w-8" strokeWidth={2.5} />
          </div>
          <h1 className="font-headline text-xl font-bold uppercase tracking-[0.25em] text-on-surface">Sentinel</h1>
        </Link>

        <div className="w-full rounded-3xl border border-white/[0.02] bg-surface-container/90 p-8 shadow-2xl backdrop-blur-md">
          <div className="mb-8 text-center">
            <h2 className="mb-2 text-[26px] font-bold font-headline">Welcome back</h2>
            <p className="text-[15px] text-on-surface-variant">Sign in to your digital orbit</p>
          </div>

          <Suspense fallback={null}>
            <LoginContent />
          </Suspense>
        </div>

        <div className="mt-8 flex items-center justify-center gap-4">
          <button type="button" className="flex items-center justify-center rounded-full border border-white/[0.03] bg-surface-container/60 p-3.5 shadow-sm transition-all hover:bg-surface-container">
            <UserRound className="h-4 w-4 text-on-surface-variant" />
          </button>
          <button type="button" className="flex items-center justify-center rounded-full border border-white/[0.03] bg-surface-container/60 p-3.5 shadow-sm transition-all hover:bg-surface-container">
            <QrCode className="h-4 w-4 text-on-surface-variant" />
          </button>
        </div>

        <div className="mt-10 flex gap-8 text-[10px] font-bold uppercase tracking-widest text-on-surface-variant/50">
          <a href="#" className="transition-colors hover:text-primary">Terms</a>
          <a href="#" className="transition-colors hover:text-primary">Privacy</a>
          <a href="#" className="transition-colors hover:text-primary">Support</a>
        </div>
      </div>
    </div>
  );
}

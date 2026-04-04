'use client';

export const dynamic = 'force-dynamic';

import Link from 'next/link';
import { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Shield, QrCode, UserRound, Wallet } from 'lucide-react';
import { login } from '@/app/actions/auth';

// Isolated to its own component so it can be wrapped in Suspense
function MessageBanner() {
  const searchParams = useSearchParams();
  const message = searchParams.get('message');
  if (!message) return null;
  return (
    <div className="mb-4 p-3 bg-surface-container-high border border-outline-variant/30 text-primary text-sm rounded-xl text-center">
      {message}
    </div>
  );
}

export default function Login() {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();

  const handleSubmit = async (formData: FormData) => {
    setLoading(true);
    setError(null);
    const result = await login(formData);
    
    if (result?.error) {
      setError(result.error);
      setLoading(false);
    } else {
      const redirectTo = searchParams.get('redirectTo') || '/chat';
      router.replace(redirectTo);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4 text-on-surface relative overflow-hidden font-body">
      {/* Background Effect */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden -z-10 pointer-events-none flex items-center justify-center">
        <div className="absolute w-[150%] h-[150%] bg-[radial-gradient(circle_at_center,rgba(163,165,250,0.06)_0%,rgba(5,7,10,0)_60%)]"></div>
      </div>

      <div className="flex flex-col items-center w-full max-w-md z-10 my-10 relative">
        {/* Logo */}
        <Link href="/" className="flex flex-col items-center mb-8 hover:scale-105 transition-transform">
          <div className="bg-[#a3a5fa] text-[#0a0c14] p-3 rounded-[1.2rem] mb-4 shadow-[0_0_30px_rgba(163,165,250,0.2)]">
            <Shield className="w-8 h-8" strokeWidth={2.5} />
          </div>
          <h1 className="text-xl font-bold tracking-[0.25em] text-on-surface uppercase font-headline">Sentinel</h1>
        </Link>

        {/* Main Card */}
        <div className="w-full bg-surface-container/90 backdrop-blur-md rounded-3xl p-8 shadow-2xl border border-white/[0.02]">
          <div className="text-center mb-8">
            <h2 className="text-[26px] font-bold mb-2 font-headline">Welcome back</h2>
            <p className="text-on-surface-variant text-[15px]">Sign in to your digital orbit</p>
          </div>

          {/* Suspense boundary required for useSearchParams() in production builds */}
          <Suspense fallback={null}>
            <MessageBanner />
          </Suspense>

          {error && (
            <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 text-red-400 text-sm rounded-xl text-center">
              {error}
            </div>
          )}

          <form className="space-y-5" action={handleSubmit}>
            {/* Email or Username Field */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold tracking-widest text-[var(--on-surface-variant)] uppercase ml-1 block">Email or Username</label>
              <input 
                type="text" 
                name="identifier"
                placeholder="name@example.com or username"
                required
                className="w-full bg-white border border-outline-variant/20 text-[#05070a] rounded-xl px-4 py-3.5 placeholder:text-[#05070a]/40 focus:outline-none focus:border-[#a3a5fa] focus:ring-1 focus:ring-[#a3a5fa] transition-all text-[15px]"
              />
            </div>

            {/* Password Field */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between ml-1 pr-1">
                <label className="text-[11px] font-bold tracking-widest text-[var(--on-surface-variant)] uppercase block">Password</label>
                <Link prefetch={false} href="/forgot-password" className="text-[11px] font-semibold text-primary/80 hover:text-primary transition-colors">
                  Forgot password?
                </Link>
              </div>
              <input 
                type="password" 
                name="password"
                placeholder="••••••••"
                required
                className="w-full bg-white border border-outline-variant/20 text-[#05070a] rounded-xl px-4 py-3.5 placeholder:text-[#05070a]/40 focus:outline-none focus:border-[#a3a5fa] focus:ring-1 focus:ring-[#a3a5fa] transition-all text-sm tracking-widest"
              />
            </div>

            {/* Submit Button */}
            <button 
              type="submit"
              disabled={loading}
              className="w-full bg-[#a3a5fa] hover:bg-[#b5b7fa] text-[#0a0c14] font-bold py-3.5 rounded-xl mt-8 shadow-[0_0_20px_rgba(163,165,250,0.15)] hover:shadow-[0_0_25px_rgba(163,165,250,0.3)] transition-all font-headline text-[15px] disabled:opacity-70"
            >
              {loading ? 'Signing in...' : 'Log In'}
            </button>
          </form>

          {/* MetaMask Login */}
          <div className="w-full mt-8">
            <div className="flex items-center justify-center gap-4 mb-6 relative">
              <div className="h-[1px] bg-outline-variant/30 flex-1"></div>
              <span className="text-[10px] font-bold tracking-widest text-on-surface-variant/60 uppercase px-1">Or continue with</span>
              <div className="h-[1px] bg-outline-variant/30 flex-1"></div>
            </div>
            
            <button type="button" className="w-full flex items-center justify-center gap-2 bg-surface-container-lowest hover:bg-surface-bright/50 border border-outline-variant/20 text-on-surface font-bold py-3.5 rounded-xl transition-all shadow-sm mb-6 text-[15px]">
              <Wallet className="w-5 h-5 text-primary" />
              Connect MetaMask
            </button>
          </div>
          
          <div className="text-[14px] text-center border-t border-outline-variant/20 pt-6">
            <span className="text-on-surface-variant">New to Sentinel?</span>{' '}
            <Link href="/register" className="text-primary font-bold hover:underline">
              Create account
            </Link>
          </div>
        </div>

        {/* Floating Auth Icons below */}
        <div className="flex items-center justify-center gap-4 mt-8">
          <button type="button" className="flex items-center justify-center bg-surface-container/60 hover:bg-surface-container border border-white/[0.03] p-3.5 rounded-full transition-all shadow-sm">
            <UserRound className="w-4 h-4 text-on-surface-variant" />
          </button>
          <button type="button" className="flex items-center justify-center bg-surface-container/60 hover:bg-surface-container border border-white/[0.03] p-3.5 rounded-full transition-all shadow-sm">
            <QrCode className="w-4 h-4 text-on-surface-variant" />
          </button>
        </div>

        {/* Minimal Footer */}
        <div className="flex gap-8 mt-10 text-[10px] text-on-surface-variant/50 font-bold tracking-widest uppercase">
          <a href="#" className="hover:text-primary transition-colors">Terms</a>
          <a href="#" className="hover:text-primary transition-colors">Privacy</a>
          <a href="#" className="hover:text-primary transition-colors">Support</a>
        </div>
      </div>
    </div>
  );
}

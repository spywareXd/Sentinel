'use client';

import Link from 'next/link';
import { useState } from 'react';
import { Network } from 'lucide-react';
import { resetPassword } from '@/app/actions/auth';

export default function ForgotPassword() {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (formData: FormData) => {
    setLoading(true);
    setError(null);
    const result = await resetPassword(formData);
    if (result?.error) {
      setError(result.error);
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4 text-on-surface relative overflow-hidden font-body">
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden -z-10 pointer-events-none flex items-center justify-center">
        <div className="absolute w-[150%] h-[150%] bg-[radial-gradient(circle_at_center,rgba(163,165,250,0.06)_0%,rgba(5,7,10,0)_60%)]"></div>
      </div>

      <div className="flex flex-col items-center w-full max-w-md z-10 my-10 relative">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="bg-[#a3a5fa] text-[#0a0c14] p-3 rounded-[1.2rem] mb-4 shadow-[0_0_30px_rgba(163,165,250,0.2)]">
            <Network className="w-8 h-8" strokeWidth={2.5} />
          </div>
        </div>

        {/* Main Card */}
        <div className="w-full bg-surface-container/90 backdrop-blur-md rounded-3xl p-8 shadow-2xl border border-white/[0.02]">
          <div className="text-center mb-8">
            <h2 className="text-[26px] font-bold mb-2 font-headline">Reset Password</h2>
            <p className="text-on-surface-variant text-[15px]">Enter your email to receive a secure reset link.</p>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 text-red-400 text-sm rounded-xl text-center">
              {error}
            </div>
          )}

          <form className="space-y-6" action={handleSubmit}>
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold tracking-widest text-[var(--on-surface-variant)] uppercase ml-1 block">Registered Email</label>
              <input 
                type="email" 
                name="email"
                required
                placeholder="name@example.com"
                className="w-full bg-surface-container-lowest/80 border border-outline-variant/20 text-on-surface rounded-xl px-4 py-3.5 placeholder:text-on-surface-variant/40 focus:outline-none focus:border-[#a3a5fa]/50 focus:ring-1 focus:ring-[#a3a5fa]/50 transition-all text-[15px]"
              />
            </div>

            <button 
              type="submit"
              disabled={loading}
              className="w-full bg-[#a3a5fa] hover:bg-[#b5b7fa] text-[#0a0c14] font-bold py-3.5 rounded-xl mt-8 shadow-[0_0_20px_rgba(163,165,250,0.15)] hover:shadow-[0_0_25px_rgba(163,165,250,0.3)] transition-all font-headline text-[15px] disabled:opacity-70"
            >
              {loading ? 'Sending...' : 'Send Reset Link'}
            </button>
          </form>

          <div className="text-[14px] text-center border-t border-outline-variant/20 pt-6 mt-8">
            <span className="text-on-surface-variant">Remembered your password?</span>{' '}
            <Link href="/login" className="text-primary font-bold hover:underline">
              Back to Login
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

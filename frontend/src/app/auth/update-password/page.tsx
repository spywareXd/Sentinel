'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Shield, Lock } from 'lucide-react';
import { createClient } from '@/utils/supabase/client';

export default function UpdatePassword() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    setLoading(true);
    const supabase = createClient();
    const { error: updateError } = await supabase.auth.updateUser({ password });

    if (updateError) {
      setError(updateError.message);
      setLoading(false);
    } else {
      router.push('/login?message=Password updated successfully. Please log in.');
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
            <Shield className="w-8 h-8" strokeWidth={2.5} />
          </div>
        </div>

        {/* Main Card */}
        <div className="w-full bg-surface-container/90 backdrop-blur-md rounded-3xl p-8 shadow-2xl border border-white/[0.02]">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-surface-container-high mb-4">
              <Lock className="w-6 h-6 text-primary" />
            </div>
            <h2 className="text-[26px] font-bold mb-2 font-headline">Set New Password</h2>
            <p className="text-on-surface-variant text-[15px]">Choose a strong password for your account.</p>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 text-red-400 text-sm rounded-xl text-center">
              {error}
            </div>
          )}

          <form className="space-y-5" onSubmit={handleSubmit}>
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold tracking-widest text-[var(--on-surface-variant)] uppercase ml-1 block">New Password</label>
              <input 
                type="password" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="••••••••"
                className="w-full bg-white border border-outline-variant/20 text-[#05070a] rounded-xl px-4 py-3.5 placeholder:text-[#05070a]/40 focus:outline-none focus:border-[#a3a5fa] focus:ring-1 focus:ring-[#a3a5fa] transition-all text-sm tracking-widest"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] font-bold tracking-widest text-[var(--on-surface-variant)] uppercase ml-1 block">Confirm Password</label>
              <input 
                type="password" 
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                placeholder="••••••••"
                className="w-full bg-white border border-outline-variant/20 text-[#05070a] rounded-xl px-4 py-3.5 placeholder:text-[#05070a]/40 focus:outline-none focus:border-[#a3a5fa] focus:ring-1 focus:ring-[#a3a5fa] transition-all text-sm tracking-widest"
              />
            </div>

            <button 
              type="submit"
              disabled={loading}
              className="w-full bg-[#a3a5fa] hover:bg-[#b5b7fa] text-[#0a0c14] font-bold py-3.5 rounded-xl mt-8 shadow-[0_0_20px_rgba(163,165,250,0.15)] hover:shadow-[0_0_25px_rgba(163,165,250,0.3)] transition-all font-headline text-[15px] disabled:opacity-70"
            >
              {loading ? 'Updating...' : 'Update Password'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

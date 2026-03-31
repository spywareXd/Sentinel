'use client';

import Link from 'next/link';
import { useState } from 'react';
import { Network, Wallet, Fingerprint, HelpCircle, Landmark, CheckCircle2 } from 'lucide-react';
import { signup } from '@/app/actions/auth';

export default function Register() {
  const [walletAddress, setWalletAddress] = useState<string>('');
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [loading, setLoading] = useState(false);

  const connectMetaMask = async () => {
    // @ts-ignore - ethereum is injected by MetaMask
    if (typeof window !== 'undefined' && typeof window.ethereum !== 'undefined') {
      try {
        setIsConnecting(true);
        setError(null);
        // @ts-ignore
        const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
        if (accounts.length > 0) {
          setWalletAddress(accounts[0]);
        }
      } catch (err: any) {
        if (err.code === 4001) {
          setError('Connection request was rejected.');
        } else {
          setError('Failed to connect to MetaMask.');
        }
        console.error(err);
      } finally {
        setIsConnecting(false);
      }
    } else {
      setError('MetaMask is not installed. Please install it to continue.');
    }
  };

  const handleSubmit = async (formData: FormData) => {
    setLoading(true);
    setError(null);
    const result = await signup(formData);
    if (result?.error) {
      setError(result.error);
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4 text-on-surface relative overflow-hidden font-body">
      {/* Background Effect */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden -z-10 pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-[#8083ff] opacity-[0.03] blur-[120px] rounded-full"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-[#00a6e0] opacity-[0.03] blur-[120px] rounded-full"></div>
      </div>

      <div className="flex flex-col items-center w-full max-w-md z-10 my-10 relative">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="bg-[#a3a5fa] text-[#0a0c14] p-3 rounded-[1.2rem] mb-4 shadow-[0_0_30px_rgba(163,165,250,0.2)]">
            <Network className="w-8 h-8" strokeWidth={2.5} />
          </div>
          <h1 className="text-xl font-bold tracking-[0.25em] text-on-surface uppercase font-headline">Nexus</h1>
        </div>

        {/* Main Card */}
        <div className="w-full bg-surface-container/90 backdrop-blur-md rounded-3xl p-8 shadow-2xl border border-white/[0.02]">
          <div className="text-center mb-8">
            <h2 className="text-[26px] font-bold mb-2 font-headline">Join the Nexus</h2>
            <p className="text-on-surface-variant text-[15px]">Step 1: Link your digital identity</p>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 text-red-400 text-sm rounded-xl text-center">
              {error}
            </div>
          )}

          <form className="space-y-6" action={handleSubmit}>
            {/* Hidden inputted wallet state for form submission */}
            <input type="hidden" name="walletAddress" value={walletAddress} />
            
            {/* MetaMask Connection Box */}
            <div className="border border-outline-variant/30 rounded-2xl p-5 bg-surface-container-lowest/30">
              <div className="flex gap-4 mb-5">
                <div className="p-2 rounded-lg bg-surface-container h-fit">
                  {walletAddress ? (
                    <CheckCircle2 className="w-5 h-5 text-green-400" />
                  ) : (
                    <Wallet className="w-5 h-5 text-on-surface" />
                  )}
                </div>
                <div>
                  <h3 className="text-sm font-bold text-on-surface tracking-wide uppercase mb-1">
                    {walletAddress ? 'Wallet Connected' : 'Wallet Connection Required'}
                  </h3>
                  <p className="text-xs text-on-surface-variant/70 leading-relaxed break-all">
                    {walletAddress 
                      ? `Linked: ${walletAddress}`
                      : 'Your wallet address serves as your unique community identity and enables your voting power in Nexus governance.'}
                  </p>
                </div>
              </div>
              
              {!walletAddress && (
                <button 
                  type="button" 
                  onClick={connectMetaMask}
                  disabled={isConnecting}
                  className="w-full flex items-center justify-center gap-2 bg-[#a3a5fa] hover:bg-[#b5b7fa] text-[#0a0c14] font-bold py-3.5 rounded-xl shadow-[0_0_20px_rgba(163,165,250,0.15)] hover:shadow-[0_0_25px_rgba(163,165,250,0.3)] transition-all font-headline text-[15px] disabled:opacity-70"
                >
                  <Wallet className="w-5 h-5" />
                  {isConnecting ? 'Connecting...' : 'Connect MetaMask'}
                </button>
              )}
            </div>

            <div className={`transition-opacity duration-300 ${walletAddress ? 'opacity-100' : 'opacity-40 pointer-events-none'}`}>
              <div className="flex items-center justify-center gap-4 relative mb-6">
                <div className="h-[1px] bg-outline-variant/30 flex-1"></div>
                <span className="text-[10px] font-bold tracking-widest text-on-surface-variant/60 uppercase px-1">Step 2: Profile Details</span>
                <div className="h-[1px] bg-outline-variant/30 flex-1"></div>
              </div>

              {/* Email Field */}
              <div className="space-y-1.5 pt-1 mb-4">
                <label className="text-[11px] font-bold tracking-widest text-[var(--on-surface-variant)] uppercase ml-1 block">Email</label>
                <input 
                  type="email" 
                  name="email"
                  placeholder="name@example.com" 
                  required
                  className="w-full bg-surface-container-lowest/80 border border-outline-variant/20 text-on-surface rounded-xl px-4 py-3.5 placeholder:text-on-surface-variant/40 focus:outline-none focus:border-[#a3a5fa]/50 focus:ring-1 focus:ring-[#a3a5fa]/50 transition-all text-[15px]"
                />
              </div>

              {/* Username Field */}
              <div className="space-y-1.5 mb-4">
                <label className="text-[11px] font-bold tracking-widest text-on-surface-variant uppercase ml-1 block">Username</label>
                <input 
                  type="text" 
                  name="username"
                  placeholder="Choose your alias" 
                  required
                  className="w-full bg-surface-container-lowest/80 border border-outline-variant/20 text-on-surface rounded-xl px-4 py-3.5 placeholder:text-on-surface-variant/40 focus:outline-none focus:border-[#a3a5fa]/50 focus:ring-1 focus:ring-[#a3a5fa]/50 transition-all text-[15px]"
                />
              </div>

              {/* Password Field */}
              <div className="space-y-1.5 mb-8">
                <label className="text-[11px] font-bold tracking-widest text-on-surface-variant uppercase ml-1 block">Password</label>
                <input 
                  type="password" 
                  name="password"
                  placeholder="••••••••" 
                  required
                  className="w-full bg-surface-container-lowest/80 border border-outline-variant/20 text-on-surface rounded-xl px-4 py-3.5 placeholder:text-on-surface-variant/40 focus:outline-none focus:border-[#a3a5fa]/50 focus:ring-1 focus:ring-[#a3a5fa]/50 transition-all text-sm tracking-widest"
                />
              </div>

              {/* Submit Button */}
              <button 
                type="submit"
                disabled={!walletAddress || loading} 
                className={`w-full font-bold py-3.5 rounded-xl transition-all font-headline text-[15px] ${
                  walletAddress 
                    ? 'bg-[#a3a5fa] text-[#0a0c14] hover:bg-[#b5b7fa] hover:shadow-[0_0_20px_rgba(163,165,250,0.2)]' 
                    : 'bg-surface-container-lowest border border-outline-variant/20 text-on-surface-variant/50 cursor-not-allowed'
                } disabled:opacity-70`}
              >
                {loading ? 'Creating account...' : 'Complete Registration'}
              </button>
            </div>
          </form>

          {/* Terms text */}
          <div className="mt-6 text-[11px] text-center text-on-surface-variant/60 px-2 leading-relaxed">
            By connecting and registering, you agree to Nexus's <a href="#" className="font-semibold text-primary/80 hover:text-primary transition-colors">Terms of Service</a> and <a href="#" className="font-semibold text-primary/80 hover:text-primary transition-colors">Privacy Policy</a>.
          </div>

          <div className="mt-8 pt-6 border-t border-outline-variant/20 text-center text-sm">
            <span className="text-on-surface-variant">Already have an account?</span>{' '}
            <Link href="/login" className="text-primary font-bold hover:underline">
              Login here
            </Link>
          </div>
        </div>

        {/* Footer Metrics */}
        <div className="flex items-center justify-between w-full mt-10 px-4">
          <div className="flex items-center gap-3 opacity-70">
            <div className="bg-surface-container-high p-2 rounded-xl">
              <Landmark className="w-5 h-5 text-on-surface-variant" />
            </div>
            <div>
              <p className="text-[10px] font-bold tracking-widest text-on-surface-variant uppercase">Governance</p>
              <p className="text-[13px] text-on-surface font-medium mt-0.5">On-chain Voting</p>
            </div>
          </div>
          
          <div className="flex items-center gap-3 opacity-70">
            <div className="bg-surface-container-high p-2 rounded-xl">
              <Fingerprint className="w-5 h-5 text-on-surface-variant" />
            </div>
            <div>
              <p className="text-[10px] font-bold tracking-widest text-on-surface-variant uppercase">Identity</p>
              <p className="text-[13px] text-on-surface font-medium mt-0.5">Wallet Auth</p>
            </div>
          </div>
        </div>

      </div>

      {/* Floating Help Button */}
      <button className="fixed bottom-6 right-6 bg-surface-container-high text-on-surface-variant p-2.5 rounded-full hover:bg-surface-bright hover:text-on-surface transition-colors shadow-lg border border-white/[0.02]">
        <HelpCircle className="w-5 h-5" />
      </button>
    </div>
  );
}

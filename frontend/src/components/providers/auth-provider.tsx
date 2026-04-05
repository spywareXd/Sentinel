"use client";

import { createContext, useEffect, useState, ReactNode } from "react";
import { createClient } from "@/utils/supabase/client";
import { Session, User } from "@supabase/supabase-js";

type AuthContextType = {
  session: Session | null;
  user: User | null;
  isLoading: boolean;
  signOut: () => Promise<void>;
  refreshSession: () => Promise<void>;
};

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [supabase] = useState(() => createClient());

  const refreshSession = async () => {
    setIsLoading(true);
    try {
      const {
        data: { session: currentSession },
      } = await supabase.auth.getSession();
      setSession(currentSession);
      setUser(currentSession?.user ?? null);
    } catch (error) {
      console.error("Error refreshing session:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    refreshSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, currentSession) => {
      setSession(currentSession);
      setUser(currentSession?.user ?? null);
      setIsLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [supabase]);

  const signOut = async () => {
    await supabase.auth.signOut();
    setSession(null);
    setUser(null);
    window.location.href = "/login";
  };

  return (
    <AuthContext.Provider value={{ session, user, isLoading, signOut, refreshSession }}>
      {children}
    </AuthContext.Provider>
  );
}


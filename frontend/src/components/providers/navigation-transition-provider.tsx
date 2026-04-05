"use client";

import {
  createContext,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { usePathname } from "next/navigation";
import SecurityHandshakeLoader from "@/components/layout/SecurityHandshakeLoader";

type NavigationTransitionContextValue = {
  isTransitioning: boolean;
  startNavigation: (href: string) => void;
};

const MIN_TRANSITION_MS = 350;
const MAX_TRANSITION_MS = 6000;

export const NavigationTransitionContext =
  createContext<NavigationTransitionContextValue | undefined>(undefined);

export function NavigationTransitionProvider({
  children,
}: {
  children: ReactNode;
}) {
  const pathname = usePathname();
  const [isTransitioning, setIsTransitioning] = useState(false);
  const startPathRef = useRef(pathname);
  const startedAtRef = useRef(0);
  const finishTimeoutRef = useRef<number | null>(null);
  const safetyTimeoutRef = useRef<number | null>(null);

  const clearTimers = useCallback(() => {
    if (finishTimeoutRef.current !== null) {
      window.clearTimeout(finishTimeoutRef.current);
      finishTimeoutRef.current = null;
    }

    if (safetyTimeoutRef.current !== null) {
      window.clearTimeout(safetyTimeoutRef.current);
      safetyTimeoutRef.current = null;
    }
  }, []);

  const stopTransition = useCallback(() => {
    clearTimers();
    setIsTransitioning(false);
  }, [clearTimers]);

  const startNavigation = useCallback(
    (href: string) => {
      if (!href.startsWith("/") || href === pathname) {
        return;
      }

      clearTimers();
      startPathRef.current = pathname;
      startedAtRef.current = Date.now();
      setIsTransitioning(true);
      safetyTimeoutRef.current = window.setTimeout(stopTransition, MAX_TRANSITION_MS);
    },
    [clearTimers, pathname, stopTransition],
  );

  useEffect(() => {
    if (!isTransitioning) {
      startPathRef.current = pathname;
      return;
    }

    if (pathname === startPathRef.current) {
      return;
    }

    const elapsedMs = Date.now() - startedAtRef.current;
    const remainingMs = Math.max(0, MIN_TRANSITION_MS - elapsedMs);

    finishTimeoutRef.current = window.setTimeout(stopTransition, remainingMs);

    return () => {
      if (finishTimeoutRef.current !== null) {
        window.clearTimeout(finishTimeoutRef.current);
        finishTimeoutRef.current = null;
      }
    };
  }, [isTransitioning, pathname, stopTransition]);

  useEffect(() => {
    return () => {
      clearTimers();
    };
  }, [clearTimers]);

  const value = useMemo(
    () => ({
      isTransitioning,
      startNavigation,
    }),
    [isTransitioning, startNavigation],
  );

  return (
    <NavigationTransitionContext.Provider value={value}>
      {children}
      {isTransitioning ? <SecurityHandshakeLoader mode="overlay" /> : null}
    </NavigationTransitionContext.Provider>
  );
}

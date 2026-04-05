"use client";

import { useContext } from "react";
import { NavigationTransitionContext } from "@/components/providers/navigation-transition-provider";

export function useNavigationTransition() {
  const context = useContext(NavigationTransitionContext);

  if (!context) {
    throw new Error(
      "useNavigationTransition must be used within a NavigationTransitionProvider",
    );
  }

  return context;
}

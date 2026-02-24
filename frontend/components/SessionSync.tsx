"use client";

import { useSession } from "next-auth/react";
import { useEffect } from "react";

/**
 * SessionSync
 * 
 * This component bridges the gap between NextAuth sessions and the Motia
 * backend's JWT-based authentication.
 * 
 * It listens for NextAuth session changes and ensures that:
 * 1. The `backendToken` is synced to localStorage as `aivon_token`.
 * 2. Any other relevant session data is available for non-NextAuth components.
 */
export default function SessionSync() {
  const { data: session, status } = useSession();

  useEffect(() => {
    if (status === "authenticated" && (session as unknown as { backendToken?: string })?.backendToken) {
      const currentToken = localStorage.getItem("aivon_token");
      const nextToken = (session as unknown as { backendToken?: string }).backendToken as string;

      if (currentToken !== nextToken) {
        console.log("[AuthSync] Syncing backend token to localStorage");
        localStorage.setItem("aivon_token", nextToken);
      }
    } else if (status === "unauthenticated") {
      if (localStorage.getItem("aivon_token")) {
        console.log("[AuthSync] Clearing backend token from localStorage");
        localStorage.removeItem("aivon_token");
      }
    }
  }, [session, status]);

  return null;
}

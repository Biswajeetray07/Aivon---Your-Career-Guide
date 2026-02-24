import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import GitHub from "next-auth/providers/github";
import Twitter from "next-auth/providers/twitter";
import Credentials from "next-auth/providers/credentials";
import type { NextAuthConfig } from "next-auth";

/**
 * Aivon NextAuth Configuration
 *
 * Supports:
 * - Google OAuth
 * - GitHub OAuth
 * - Twitter/X OAuth
 * - Email/password (Credentials) — delegates to the Motia backend
 *
 * On first OAuth login, the Motia backend is called to upsert the user
 * (merging by email if they already have a credentials account).
 */

const BACKEND_URL = process.env.BACKEND_URL || "http://127.0.0.1:3002";

const config: NextAuthConfig = {
  trustHost: true,
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
    GitHub({
      clientId: process.env.GITHUB_CLIENT_ID!,
      clientSecret: process.env.GITHUB_CLIENT_SECRET!,
    }),
    Twitter({
      clientId: process.env.TWITTER_CLIENT_ID!,
      clientSecret: process.env.TWITTER_CLIENT_SECRET!,
    }),
    Credentials({
      name: "Email & Password",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        try {
          const res = await fetch(`${BACKEND_URL}/api/auth/login`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              email: credentials?.email,
              password: credentials?.password,
            }),
          });
          if (!res.ok) return null;
          const data = await res.json();
          return {
            id: data.user.id,
            email: data.user.email,
            name: data.user.name,
            backendToken: data.token,
          };
        } catch {
          return null;
        }
      },
    }),
  ],

  callbacks: {
    async signIn({ user, account }) {
      if (account?.provider && account.provider !== "credentials") {
        // Upsert user in Motia backend on OAuth login
        try {
          await fetch(`${BACKEND_URL}/api/auth/oauth-upsert`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              email: user.email,
              name: user.name,
              avatar: user.image,
              provider: account.provider,
              providerAccountId: account.providerAccountId,
            }),
          });
        } catch (err) {
          console.error("[NextAuth] OAuth upsert failed:", err);
        }
      }
      return true;
    },

    async jwt({ token, user, account }) {
      if (user) {
        token.userId = user.id;
        token.backendToken = (user as { backendToken?: string }).backendToken;
      }
      if (account?.provider && account.provider !== "credentials") {
        // Fetch the backend JWT for this OAuth user
        try {
          const res = await fetch(`${BACKEND_URL}/api/auth/oauth-token`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email: token.email }),
          });
          if (res.ok) {
            const data = await res.json();
            token.backendToken = data.token;
            token.userId = data.user.id;
          }
        } catch {
          // Will work on next request
        }
      }
      return token;
    },

    async session({ session, token }) {
      if (token.userId) {
        (session as { userId?: string }).userId = token.userId as string;
      }
      if (token.backendToken) {
        (session as { backendToken?: string }).backendToken = token.backendToken as string;
      }
      return session;
    },
  },

  pages: {
    signIn: "/sign-in",
    error: "/sign-in",
  },

  session: {
    strategy: "jwt",
  },
};

export const { handlers, auth, signIn, signOut } = NextAuth(config);

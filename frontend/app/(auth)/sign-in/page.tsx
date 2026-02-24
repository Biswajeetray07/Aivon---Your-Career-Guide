"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await signIn("credentials", {
        redirect: false,
        email,
        password,
      });
      
      if (res?.error) {
        setError("Invalid email or password");
      } else {
        router.push("/dashboard");
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Login failed");
    }
    setLoading(false);
  }

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--bg-primary)" }}>
      <div className="card" style={{ width: 420, padding: 40 }}>
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <div style={{ width: 48, height: 48, background: "linear-gradient(135deg, #00E5FF, #3b82f6)", borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24, margin: "0 auto 16px" }}>⚡</div>
          <h1 style={{ fontSize: 24, fontWeight: 700 }}>Welcome back</h1>
          <p style={{ color: "var(--text-muted)", fontSize: 14, marginTop: 8 }}>Sign in to continue coding</p>
        </div>
        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {error && <div style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)", borderRadius: 8, padding: "10px 14px", fontSize: 13, color: "var(--red)" }}>{error}</div>}
          {[{ label: "Email", type: "email", value: email, set: setEmail }, { label: "Password", type: "password", value: password, set: setPassword }].map(({ label, type, value, set }) => (
            <div key={label}>
              <label htmlFor={label.toLowerCase()} style={{ fontSize: 13, fontWeight: 500, color: "var(--text-secondary)", display: "block", marginBottom: 6 }}>{label}</label>
              <input 
                id={label.toLowerCase()}
                type={type} value={value} onChange={(e) => set(e.target.value)} required
                style={{ width: "100%", background: "var(--bg-hover)", border: "1px solid var(--border)", borderRadius: 8, padding: "10px 14px", color: "var(--text-primary)", fontSize: 14, fontFamily: "inherit", outline: "none", transition: "border-color 0.2s" }}
                onFocus={(e) => (e.target.style.borderColor = "var(--accent-cyan)")}
                onBlur={(e) => (e.target.style.borderColor = "var(--border)")} />
            </div>
          ))}
          <button type="submit" className="btn-primary" disabled={loading} style={{ width: "100%", padding: "12px", marginTop: 8 }}>
            {loading ? "Signing in..." : "Sign In"}
          </button>
        </form>
        <p style={{ textAlign: "center", marginTop: 24, fontSize: 13, color: "var(--text-muted)" }}>
          No account? <Link href="/sign-up" style={{ color: "var(--accent-cyan-light)", fontWeight: 600 }}>Sign up</Link>
        </p>
      </div>
    </div>
  );
}

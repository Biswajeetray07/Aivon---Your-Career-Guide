"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { register } from "@/lib/api";

export default function RegisterPage() {
  const [name, setName] = useState("");
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
      const { token } = await register(email, password, name);
      localStorage.setItem("aivon_token", token);
      router.push("/problems");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Registration failed");
    }
    setLoading(false);
  }

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--bg-primary)" }}>
      <div className="card" style={{ width: 420, padding: 40 }}>
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <div style={{ width: 48, height: 48, background: "linear-gradient(135deg, #7c3aed, #3b82f6)", borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24, margin: "0 auto 16px" }}>⚡</div>
          <h1 style={{ fontSize: 24, fontWeight: 700 }}>Join Aivon</h1>
          <p style={{ color: "var(--text-muted)", fontSize: 14, marginTop: 8 }}>Start solving with AI assistance</p>
        </div>
        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {error && <div style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)", borderRadius: 8, padding: "10px 14px", fontSize: 13, color: "var(--red)" }}>{error}</div>}
          {[
            { label: "Name (optional)", type: "text", value: name, set: setName, required: false },
            { label: "Email", type: "email", value: email, set: setEmail, required: true },
            { label: "Password (min 8 chars)", type: "password", value: password, set: setPassword, required: true },
          ].map(({ label, type, value, set, required }) => (
            <div key={label}>
              <label style={{ fontSize: 13, fontWeight: 500, color: "var(--text-secondary)", display: "block", marginBottom: 6 }}>{label}</label>
              <input type={type} value={value} onChange={(e) => set(e.target.value)} required={required}
                style={{ width: "100%", background: "var(--bg-hover)", border: "1px solid var(--border)", borderRadius: 8, padding: "10px 14px", color: "var(--text-primary)", fontSize: 14, fontFamily: "inherit", outline: "none", transition: "border-color 0.2s" }}
                onFocus={(e) => (e.target.style.borderColor = "var(--accent-purple)")}
                onBlur={(e) => (e.target.style.borderColor = "var(--border)")} />
            </div>
          ))}
          <button type="submit" className="btn-primary" disabled={loading} style={{ width: "100%", padding: "12px", marginTop: 8 }}>
            {loading ? "Creating account..." : "Create Account ⚡"}
          </button>
        </form>
        <p style={{ textAlign: "center", marginTop: 24, fontSize: 13, color: "var(--text-muted)" }}>
          Already have an account? <Link href="/login" style={{ color: "var(--accent-purple-light)", fontWeight: 600 }}>Login</Link>
        </p>
      </div>
    </div>
  );
}

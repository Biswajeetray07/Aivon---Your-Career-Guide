"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

const navItems = [
  { href: "/problems", label: "Problems", icon: "⚡" },
  { href: "/leaderboard", label: "Leaderboard", icon: "🏆" },
  { href: "/profile", label: "Profile", icon: "👤" },
];

export default function Sidebar() {
  const pathname = usePathname();
  const [user, setUser] = useState<{ name?: string; email?: string; rating?: number } | null>(null);

  useEffect(() => {
    const token = localStorage.getItem("aivon_token");
    if (token) {
      fetch("/api/auth/session", { headers: { Authorization: `Bearer ${token}` } })
        .then((r) => r.json())
        .then((d) => d.user && setUser(d.user))
        .catch(() => {});
    }
  }, []);

  return (
    <aside className="sidebar">
      <div className="logo">
        <div className="logo-icon">⚡</div>
        Aivon
      </div>

      <nav style={{ flex: 1 }}>
        {navItems.map((item) => (
          <Link key={item.href} href={item.href}>
            <div className={`nav-item ${pathname.startsWith(item.href) ? "active" : ""}`}>
              <span style={{ fontSize: 16 }}>{item.icon}</span>
              {item.label}
            </div>
          </Link>
        ))}
      </nav>

      <div style={{ borderTop: "1px solid var(--border)", paddingTop: 16, marginTop: 16 }}>
        {user ? (
          <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "8px 12px" }}>
            <div style={{ width: 36, height: 36, borderRadius: "50%", background: "linear-gradient(135deg, #7c3aed, #3b82f6)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 700 }}>
              {(user.name || user.email || "U")[0].toUpperCase()}
            </div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)" }}>{user.name || user.email?.split("@")[0]}</div>
              <div style={{ fontSize: 11, color: "var(--text-muted)" }}>Rating: {user.rating}</div>
            </div>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <Link href="/login"><button className="btn-primary" style={{ width: "100%", padding: "8px 16px" }}>Login</button></Link>
            <Link href="/register"><button className="btn-secondary" style={{ width: "100%", padding: "8px 16px" }}>Register</button></Link>
          </div>
        )}
      </div>
    </aside>
  );
}

"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, useCallback } from "react";

const navItems = [
  { href: "/problems", label: "Problems", icon: "⚡" },
  { href: "/leaderboard", label: "Leaderboard", icon: "🏆" },
  { href: "/profile", label: "Profile", icon: "👤" },
];

export type SidebarState = "expanded" | "collapsed" | "hidden";

const COLLAPSED_W = 56;
const DEFAULT_EXPANDED_W = 240;

export function useSidebarState() {
  const [state, _setState] = useState<SidebarState>("expanded");
  const [width, setWidth] = useState(DEFAULT_EXPANDED_W);
  const [mounted, setMounted] = useState(false);

  // Load from localStorage on mount
  useEffect(() => {
    const savedState = (localStorage.getItem("ui:sidebar:state") as SidebarState) || "expanded";
    const savedWidth = parseInt(localStorage.getItem("ui:sidebar:width") || `${DEFAULT_EXPANDED_W}`, 10);
    _setState(savedState);
    setWidth(Math.max(180, Math.min(400, savedWidth)));
    setMounted(true);
  }, []);

  const setState = useCallback((next: SidebarState | ((prev: SidebarState) => SidebarState)) => {
    _setState(prev => {
      const resolved = typeof next === "function" ? next(prev) : next;
      localStorage.setItem("ui:sidebar:state", resolved);
      return resolved;
    });
  }, []);

  const toggle = useCallback(() => {
    setState(prev => prev === "expanded" ? "collapsed" : "expanded");
  }, [setState]);

  const currentWidth = !mounted ? DEFAULT_EXPANDED_W : state === "expanded" ? width : state === "collapsed" ? COLLAPSED_W : 0;

  return { state, setState, width, setWidth, toggle, currentWidth, mounted };
}

interface SidebarProps {
  sidebarState?: SidebarState;
  currentWidth?: number;
  onToggle?: () => void;
}

export default function Sidebar({ sidebarState: _state, currentWidth: _width, onToggle: _toggle }: SidebarProps = {}) {
  // Allow standalone usage (other pages) — create own internal state if no props passed
  const internal = useSidebarState();
  const sidebarState = _state ?? internal.state;
  const currentWidth = _width ?? internal.currentWidth;
  const onToggle = _toggle ?? internal.toggle;
  const pathname = usePathname();
  const [user, setUser] = useState<{ name?: string; email?: string; rating?: number } | null>(null);
  const collapsed = sidebarState === "collapsed";
  const hidden = sidebarState === "hidden";

  useEffect(() => {
    const token = localStorage.getItem("aivon_token");
    if (token) {
      fetch("/api/auth/session", { headers: { Authorization: `Bearer ${token}` } })
        .then(r => r.json())
        .then(d => d.user && setUser(d.user))
        .catch(() => {});
    }
  }, []);

  return (
    <aside
      style={{
        width: currentWidth,
        minWidth: hidden ? 0 : undefined,
        flexShrink: 0,
        display: "flex",
        flexDirection: "column",
        height: "100vh",
        background: "var(--bg-secondary)",
        borderRight: "1px solid var(--border)",
        transition: "width 220ms cubic-bezier(0.4,0,0.2,1)",
        overflow: "hidden",
        position: "relative",
        willChange: "width",
      }}
    >
      {/* ── Logo + Toggle ── */}
      <div style={{
        display: "flex", alignItems: "center",
        padding: collapsed ? "16px 0" : "16px 16px",
        justifyContent: collapsed ? "center" : "space-between",
        borderBottom: "1px solid var(--border)",
        flexShrink: 0,
        gap: 8,
      }}>
        {!collapsed && (
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{
              width: 28, height: 28, borderRadius: 8,
              background: "linear-gradient(135deg, #7c3aed, #3b82f6)",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 14, fontWeight: 700, flexShrink: 0,
            }}>⚡</div>
            <span style={{ fontSize: 15, fontWeight: 800, color: "var(--text-primary)", letterSpacing: "-0.3px" }}>
              Aivon
            </span>
          </div>
        )}
        <button
          onClick={onToggle}
          title={collapsed ? "Expand sidebar (Ctrl+B)" : "Collapse sidebar (Ctrl+B)"}
          style={{
            width: 32, height: 32, borderRadius: 8, border: "none",
            background: "transparent", cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "center",
            color: "var(--text-muted)", fontSize: 16,
            transition: "background 120ms ease, color 120ms ease",
            flexShrink: 0,
          }}
          onMouseEnter={e => {
            (e.currentTarget as HTMLElement).style.background = "rgba(148,163,184,0.12)";
            (e.currentTarget as HTMLElement).style.color = "var(--text-primary)";
          }}
          onMouseLeave={e => {
            (e.currentTarget as HTMLElement).style.background = "transparent";
            (e.currentTarget as HTMLElement).style.color = "var(--text-muted)";
          }}
        >
          {collapsed ? "→" : "☰"}
        </button>
      </div>

      {/* ── Nav Items ── */}
      <nav style={{ flex: 1, padding: collapsed ? "8px 0" : "8px" }}>
        {navItems.map(item => {
          const active = pathname.startsWith(item.href);
          return (
            <Tooltip key={item.href} label={item.label} collapsed={collapsed}>
              <Link href={item.href} style={{ textDecoration: "none", display: "block" }}>
                <div
                  onMouseEnter={(e) => {
                    const icon = e.currentTarget.querySelector('.nav-icon') as HTMLElement;
                    if (icon) icon.style.transform = "scale(1.15)";
                  }}
                  onMouseLeave={(e) => {
                    const icon = e.currentTarget.querySelector('.nav-icon') as HTMLElement;
                    if (icon) icon.style.transform = "scale(1)";
                  }}
                  style={{
                  display: "flex", alignItems: "center",
                  gap: collapsed ? 0 : 10,
                  padding: collapsed ? "10px 0" : "9px 12px",
                  justifyContent: collapsed ? "center" : "flex-start",
                  borderRadius: collapsed ? 0 : 8,
                  margin: collapsed ? 0 : "2px 0",
                  background: active
                    ? (collapsed ? "transparent" : "rgba(124,58,237,0.15)")
                    : "transparent",
                  color: active ? "#a78bfa" : "var(--text-secondary)",
                  fontSize: 13, fontWeight: active ? 600 : 400,
                  transition: "background var(--transition-smooth), color var(--transition-fast)",
                  cursor: "pointer",
                  position: "relative",
                }}>
                  {/* Active indicator */}
                  {active && collapsed && (
                    <div style={{
                      position: "absolute", left: 0, top: "50%", transform: "translateY(-50%)",
                      width: 3, height: 20, background: "#7c3aed", borderRadius: "0 3px 3px 0",
                    }} />
                  )}
                  <span className="nav-icon" style={{ fontSize: collapsed ? 18 : 16, flexShrink: 0, transition: "transform var(--transition-fast)" }}>{item.icon}</span>
                  {!collapsed && <span style={{ transition: "transform var(--transition-fast)" }}>{item.label}</span>}
                </div>
              </Link>
            </Tooltip>
          );
        })}
      </nav>

      {/* ── User Footer ── */}
      <div style={{ borderTop: "1px solid var(--border)", padding: collapsed ? "12px 0" : "12px 16px", flexShrink: 0 }}>
        {user ? (
          <Tooltip label={`${user.name || user.email?.split("@")[0]} · ${user.rating}`} collapsed={collapsed}>
            <div style={{
              display: "flex", alignItems: "center",
              gap: collapsed ? 0 : 10,
              justifyContent: collapsed ? "center" : "flex-start",
              cursor: "default",
            }}>
              <div style={{
                width: 32, height: 32, borderRadius: "50%", flexShrink: 0,
                background: "linear-gradient(135deg, #7c3aed, #3b82f6)",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 13, fontWeight: 700,
              }}>
                {(user.name || user.email || "U")[0].toUpperCase()}
              </div>
              {!collapsed && (
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)" }}>
                    {user.name || user.email?.split("@")[0]}
                  </div>
                  <div style={{ fontSize: 11, color: "var(--text-muted)" }}>⭐ {user.rating}</div>
                </div>
              )}
            </div>
          </Tooltip>
        ) : (
          !collapsed && (
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <Link href="/login"><button className="btn-primary" style={{ width: "100%", padding: "7px 14px" }}>Login</button></Link>
              <Link href="/register"><button className="btn-secondary" style={{ width: "100%", padding: "7px 14px" }}>Register</button></Link>
            </div>
          )
        )}
      </div>
    </aside>
  );
}

/* ── Tooltip component for collapsed mode ── */
function Tooltip({ label, collapsed, children }: { label: string; collapsed: boolean; children: React.ReactNode }) {
  const [visible, setVisible] = useState(false);
  if (!collapsed) return <>{children}</>;
  return (
    <div
      style={{ position: "relative" }}
      onMouseEnter={() => setVisible(true)}
      onMouseLeave={() => setVisible(false)}
    >
      {children}
      {visible && (
        <div style={{
          position: "fixed",
          left: COLLAPSED_W + 8,
          transform: "translateY(-50%)",
          background: "rgba(15,15,25,0.97)",
          border: "1px solid rgba(255,255,255,0.1)",
          borderRadius: 7, padding: "5px 10px",
          fontSize: 12, fontWeight: 600,
          color: "var(--text-primary)",
          whiteSpace: "nowrap",
          zIndex: 99999,
          pointerEvents: "none",
          boxShadow: "0 4px 16px rgba(0,0,0,0.4)",
        }}>
          {label}
        </div>
      )}
    </div>
  );
}

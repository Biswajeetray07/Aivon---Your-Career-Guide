import Link from "next/link";
import { Github, Twitter, Mail, Terminal } from "lucide-react";
import { GlassCard } from "@/components/ui/glass-card";

export function Footer() {
  return (
    <footer className="relative border-t border-[var(--border)] bg-[var(--background)]/50 backdrop-blur-md pt-24 pb-12 overflow-hidden mt-32">
      {/* Glow behind footer */}
      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-[var(--primary)]/10 blur-[120px] rounded-t-full pointer-events-none" />
      
      <div className="container mx-auto px-6 lg:px-12 relative z-10">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-16 mb-20">
          
          {/* Left Side */}
          <div className="flex flex-col gap-8">
            <h2 className="text-4xl md:text-5xl font-bold font-space-grotesk tracking-tight leading-tight">
              Let&apos;s build <br/> something <span className="text-gradient">together</span>
            </h2>
            <Link href="mailto:hello@aivon.ai" className="inline-flex">
              <button className="px-8 py-4 rounded-xl bg-[var(--primary)]/10 text-[var(--primary)] font-semibold border border-[var(--primary)]/30 hover:bg-[var(--primary)]/20 hover:scale-105 transition-all duration-300 flex items-center gap-3">
                send a signal <Terminal size={18} />
              </button>
            </Link>
          </div>

          {/* Right Side - Socials */}
          <div className="flex flex-col gap-4 justify-center">
            <SocialCard icon={<Github />} label="GitHub" handle="@aivon_dsa" href="https://github.com" />
            <SocialCard icon={<Twitter />} label="Twitter" handle="@aivon_dsa" href="https://twitter.com" />
            <SocialCard icon={<Mail />} label="Email" handle="hello@aivon.ai" href="mailto:hello@aivon.ai" />
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="pt-8 border-t border-[var(--border)] flex items-center justify-center text-sm text-[var(--text-muted)]">
          <div className="font-mono tracking-widest text-xs uppercase">© {new Date().getFullYear()} Aivon AI. All systems operational.</div>
        </div>
      </div>
    </footer>
  );
}

function SocialCard({ icon, label, handle, href }: { icon: React.ReactNode, label: string, handle: string, href: string }) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer">
      <GlassCard hoverLift className="p-4 flex items-center justify-between group">
        <div className="flex items-center gap-4 text-[var(--text-secondary)] group-hover:text-[var(--primary)] transition-colors">
          {icon}
          <span className="font-medium">{label}</span>
        </div>
        <span className="font-mono text-xs opacity-50 group-hover:opacity-100 transition-opacity">
          {handle}
        </span>
      </GlassCard>
    </a>
  );
}

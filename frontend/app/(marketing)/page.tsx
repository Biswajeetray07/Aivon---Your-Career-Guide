import { HeroSection } from "@/components/sections/hero-section";
import { ProjectsGrid } from "@/components/sections/projects-grid";
import { LabNotes } from "@/components/sections/lab-notes";
import { Workbench } from "@/components/sections/workbench";
import { Footer } from "@/components/layout/footer";
import { HackerNetworkBackground } from "@/components/ui/hacker-network-background";

export default function MarketingPage() {
  return (
    <div className="relative isolate min-h-screen break-words">
      {/* Global Green Spiderman-Hacker 3D Background */}
      <div className="fixed inset-0 z-[-1]">
        <HackerNetworkBackground />
      </div>

      <div className="relative z-10">
        <HeroSection />
        <ProjectsGrid />
        <LabNotes />
        <Workbench />
        <Footer />
      </div>
    </div>
  );
}

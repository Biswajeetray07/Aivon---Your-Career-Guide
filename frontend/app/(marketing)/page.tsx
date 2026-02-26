import { HeroSection } from "@/components/sections/hero-section";
import { ProjectsGrid } from "@/components/sections/projects-grid";
import { LabNotes } from "@/components/sections/lab-notes";
import { Workbench } from "@/components/sections/workbench";
import { Footer } from "@/components/layout/footer";

export default function MarketingPage() {
  return (
    <div className="relative isolate min-h-screen break-words">

      <div className="relative z-10 w-full max-w-[1500px] mx-auto">
        <HeroSection />
        <ProjectsGrid />
        <LabNotes />
        <Workbench />
        <Footer />
      </div>
    </div>
  );
}

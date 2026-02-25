import { HeroSection } from "@/components/sections/hero-section";
import { ProjectsGrid } from "@/components/sections/projects-grid";
import { LabNotes } from "@/components/sections/lab-notes";
import { Workbench } from "@/components/sections/workbench";
import { Footer } from "@/components/layout/footer";

export default function MarketingPage() {
  return (
    <>
      <HeroSection />
      <ProjectsGrid />
      <LabNotes />
      <Workbench />
      <Footer />
    </>
  );
}

import { useCallback } from "react";

import {
  approachIntro,
  experience,
  principles,
  projects,
  workIntro,
} from "./portfolio-data.js";
import { ContactSection } from "./ContactSection.jsx";
import { ExperienceSection } from "./ExperienceSection.jsx";
import { HeroSection } from "./HeroSection.jsx";
import { PointerLight } from "./PointerLight.jsx";
import { ProjectCard } from "./ProjectCard.jsx";
import { VisitorMonitor } from "./VisitorMonitor.jsx";

function SectionLabel({ number, children }) {
  return (
    <p className="section-label">
      <span>{number}</span>
      {children}
    </p>
  );
}

export function App() {
  const handleOpenCase = useCallback((caseId) => {
    window.location.assign(`/case/${caseId}`);
  }, []);

  return (
    <>
      <PointerLight />
      <div>
        <HeroSection />

        <main className="content-layer">
          <section
            className="section work"
            id="work"
            data-track-section
            data-track-label="SELECTED WORK"
          >
            <div className="shell">
              <SectionLabel number="01">SELECTED WORK</SectionLabel>
              <header className="section-heading">
                <h2>PROOF THROUGH PROJECTS</h2>
                <p>{workIntro}</p>
              </header>
              <div className="project-grid">
                {projects.map((project) => (
                  <ProjectCard
                    key={project.id}
                    project={project}
                    onOpenCase={handleOpenCase}
                  />
                ))}
              </div>
            </div>
          </section>

          <section
            className="section approach"
            id="approach"
            data-track-section
            data-track-label="APPROACH"
          >
            <div className="shell">
              <SectionLabel number="02">APPROACH</SectionLabel>
              <div className="approach__layout">
                <header className="approach__intro">
                  <h2>
                    HOW I MOVE
                    <br />
                    DESIGN FORWARD
                  </h2>
                  <p>{approachIntro}</p>
                </header>

                <ol className="principles">
                  {principles.map((item) => (
                    <li key={item.number}>
                      <span className="principles__number">{item.number}</span>
                      <span className="principles__copy">
                        <strong>{item.title}</strong>
                        <span>{item.description}</span>
                      </span>
                    </li>
                  ))}
                </ol>
              </div>
            </div>
          </section>

          <ExperienceSection items={experience} />

          <ContactSection />
        </main>
        <VisitorMonitor />
      </div>
    </>
  );
}

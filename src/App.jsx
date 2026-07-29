import { useCallback, useRef, useState } from "react";

import { experience, principles, projects } from "./portfolio-data.js";
import { CaseStudyModal } from "./CaseStudyModal.jsx";
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
  const backgroundRef = useRef(null);
  const returnFocusRef = useRef(null);
  const [selectedCaseId, setSelectedCaseId] = useState(null);
  const selectedProject = projects.find(
    (project) => project.id === selectedCaseId,
  );
  const handleOpenCase = useCallback((caseId) => {
    returnFocusRef.current = document.activeElement;
    setSelectedCaseId(caseId);
  }, []);
  const handleCloseCase = useCallback(() => setSelectedCaseId(null), []);

  return (
    <>
      <PointerLight />
      <div ref={backgroundRef}>
        <HeroSection />

        <main className="content-layer">
          <section
            className="section approach"
            id="approach"
            data-track-section
            data-track-label="APPROACH"
          >
            <div className="shell">
              <SectionLabel number="01">APPROACH</SectionLabel>
              <div className="approach__layout">
                <header className="approach__intro">
                  <h2>
                    HOW I MOVE
                    <br />
                    DESIGN FORWARD
                  </h2>
                  <p>从判断问题开始，到定义方向、推动交付、沉淀方法</p>
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

          <section
            className="section work"
            id="work"
            data-track-section
            data-track-label="SELECTED WORK"
          >
            <div className="shell">
              <SectionLabel number="02">SELECTED WORK</SectionLabel>
              <header className="section-heading">
                <h2>PROOF THROUGH PROJECTS</h2>
                <p>以三个代表项目，呈现从业务拆解到全渠道落地的架构与闭环能力</p>
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

          <ExperienceSection items={experience} />

          <ContactSection />
        </main>
        <VisitorMonitor />
      </div>
      <CaseStudyModal
        caseId={selectedCaseId}
        title={selectedProject?.title ?? ""}
        onClose={handleCloseCase}
        backgroundRef={backgroundRef}
        returnFocusRef={returnFocusRef}
      />
    </>
  );
}

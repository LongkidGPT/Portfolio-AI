import { useCallback } from "react";

import { CaseStudyModal } from "./CaseStudyModal.jsx";
import { projects } from "./portfolio-data.js";

export function CaseStudyPage({ caseId }) {
  const selectedProjectIndex = projects.findIndex(
    (project) => project.caseId === caseId,
  );
  const selectedProject = projects[selectedProjectIndex];
  const previousProject =
    selectedProjectIndex > 0 ? projects[selectedProjectIndex - 1] : null;
  const nextProject =
    selectedProjectIndex >= 0 && selectedProjectIndex < projects.length - 1
      ? projects[selectedProjectIndex + 1]
      : null;
  const selectCase = useCallback((nextCaseId) => {
    window.location.assign(`/case/${nextCaseId}`);
  }, []);
  const returnToWork = useCallback(() => {
    window.location.assign("/#work");
  }, []);

  if (!selectedProject) return null;

  return (
    <CaseStudyModal
      standalone
      caseId={caseId}
      title={selectedProject.title}
      onClose={returnToWork}
      previousProject={previousProject}
      nextProject={nextProject}
      onSelectCase={selectCase}
    />
  );
}

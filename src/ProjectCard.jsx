import { ArrowUpRight } from "@phosphor-icons/react";

export function ProjectCard({ project, onOpenCase }) {
  return (
    <button
      className={`project-card ${project.className}${
        project.temporaryArtworkRatio ? " project-card--temporary-art" : ""
      }`}
      type="button"
      aria-label={`${project.title}，查看项目`}
      data-track-label={project.title}
      onClick={() => onOpenCase(project.caseId)}
    >
      <span
        className="project-card__artwork"
        style={{
          "--artwork-ratio": project.artworkRatio,
          "--temporary-artwork-ratio":
            project.temporaryArtworkRatio ?? project.artworkRatio,
        }}
      >
        <img
          className="project-card__image project-card__image--default"
          src={project.defaultImage}
          alt=""
        />
        <img
          className="project-card__image project-card__image--hover"
          src={project.hoverImage}
          alt=""
        />
      </span>
      <span className="project-card__panel">
        <span className="project-card__copy">
          <strong>{project.title}</strong>
          <span>{project.description}</span>
        </span>
        <span className="project-card__arrow" aria-hidden="true">
          <ArrowUpRight size={24} />
        </span>
      </span>
    </button>
  );
}

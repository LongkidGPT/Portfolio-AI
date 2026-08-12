import { ArrowUpRight } from "@phosphor-icons/react";
import { useEffect, useState } from "react";

import { resolveProjectArtwork } from "./portfolio-data.js";

const hoverMedia = "(hover: hover) and (pointer: fine)";

function initialHoverCapability() {
  if (typeof window === "undefined") return null;
  return window.matchMedia(hoverMedia).matches;
}

export function ProjectCard({ project, onOpenCase }) {
  const [canHover, setCanHover] = useState(initialHoverCapability);
  const [hoverRequested, setHoverRequested] = useState(false);
  const [hoverReady, setHoverReady] = useState(false);
  const { defaultSrc, hoverSrc } = resolveProjectArtwork(project, {
    canHover,
    hoverRequested,
  });

  useEffect(() => {
    const mediaQuery = window.matchMedia(hoverMedia);
    const handleCapabilityChange = ({ matches }) => {
      setCanHover(matches);
      setHoverRequested(false);
      setHoverReady(false);
    };

    handleCapabilityChange(mediaQuery);
    mediaQuery.addEventListener("change", handleCapabilityChange);

    return () =>
      mediaQuery.removeEventListener("change", handleCapabilityChange);
  }, []);

  const requestHoverArtwork = () => {
    if (canHover) setHoverRequested(true);
  };

  return (
    <button
      className={`project-card ${project.className}${
        project.temporaryArtworkRatio ? " project-card--temporary-art" : ""
      }${hoverReady ? " project-card--hover-ready" : ""}`}
      type="button"
      aria-label={`${project.title}，查看项目`}
      data-track-label={project.title}
      data-project-id={project.id}
      onClick={() => onOpenCase(project.caseId)}
      onPointerEnter={requestHoverArtwork}
      onFocus={requestHoverArtwork}
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
          src={defaultSrc}
          loading="lazy"
          decoding="async"
          alt=""
        />
        <img
          className="project-card__image project-card__image--hover"
          src={hoverSrc}
          loading="lazy"
          decoding="async"
          onLoad={() => setHoverReady(true)}
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

import { ArrowDown, ArrowUpRight } from "@phosphor-icons/react";
import { useCallback, useEffect, useRef, useState } from "react";

import { experience, principles, projects } from "./portfolio-data.js";
import { CaseStudyModal } from "./CaseStudyModal.jsx";
import { copyText } from "./copy-text.js";
import { ExperienceSection } from "./ExperienceSection.jsx";
import { resolveHeroMode } from "./hero-controller.js";
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

function CopyButton({
  value,
  label,
  copiedLabel,
  className,
  trackLabel,
  showArrow = false,
}) {
  const [copyState, setCopyState] = useState("idle");
  const feedbackTimerRef = useRef(null);

  useEffect(
    () => () => window.clearTimeout(feedbackTimerRef.current),
    [],
  );

  const handleCopy = async () => {
    const copied = await copyText(value);
    setCopyState(copied ? "copied" : "failed");
    window.clearTimeout(feedbackTimerRef.current);
    feedbackTimerRef.current = window.setTimeout(
      () => setCopyState("idle"),
      1800,
    );
  };

  const visibleLabel =
    copyState === "copied"
      ? copiedLabel
      : copyState === "failed"
        ? "复制失败，请重试"
        : label;

  return (
    <button
      className={`${className} copy-action copy-action--${copyState}`}
      type="button"
      data-track-label={trackLabel}
      onClick={handleCopy}
      aria-live="polite"
    >
      {visibleLabel}
      {copyState === "copied" ? (
        <span className="copy-action__status" aria-hidden="true">
          ✓
        </span>
      ) : (
        showArrow && (
          <ArrowUpRight aria-hidden="true" size={14} weight="regular" />
        )
      )}
    </button>
  );
}

export function App() {
  const videoRef = useRef(null);
  const backgroundRef = useRef(null);
  const returnFocusRef = useRef(null);
  const [heroState, setHeroState] = useState("loading");
  const [selectedCaseId, setSelectedCaseId] = useState(null);
  const replayedRef = useRef(false);
  const selectedProject = projects.find(
    (project) => project.id === selectedCaseId,
  );
  const handleOpenCase = useCallback((caseId) => {
    returnFocusRef.current = document.activeElement;
    setSelectedCaseId(caseId);
  }, []);
  const handleCloseCase = useCallback(() => setSelectedCaseId(null), []);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return undefined;

    const reducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    const coarsePointer = window.matchMedia("(pointer: coarse)").matches;
    const mode = resolveHeroMode({
      reducedMotion,
      coarsePointer,
      autoplayBlocked: false,
    });

    if (mode === "poster") {
      setHeroState("settled");
      return undefined;
    }

    const attemptPlayback = async () => {
      try {
        await video.play();
        setHeroState("playing");
      } catch {
        setHeroState("settled");
      }
    };

    attemptPlayback();
    const handleEnd = () => setHeroState("settled");
    video.addEventListener("ended", handleEnd);

    return () => video.removeEventListener("ended", handleEnd);
  }, []);

  const handleHeroPointerEnter = () => {
    const video = videoRef.current;
    if (!video || replayedRef.current || heroState !== "settled") return;
    if (window.matchMedia("(pointer: coarse)").matches) return;

    replayedRef.current = true;
    video.currentTime = 0;
    video.play().then(() => setHeroState("playing")).catch(() => {});
  };

  return (
    <>
      <div ref={backgroundRef}>
      <section
        className={`hero hero--${heroState}`}
        id="hero"
        data-track-section
        data-track-label="HERO"
        onPointerEnter={handleHeroPointerEnter}
      >
        <video
          ref={videoRef}
          className="hero__video"
          src="/assets/hero-bg-optimized.mp4"
          poster="/assets/hero-poster.webp"
          muted
          playsInline
          preload="metadata"
          aria-hidden="true"
        />
        <div className="hero__scrim" />

        <nav className="top-nav" aria-label="主导航">
          <a className="top-nav__brand" href="#hero">
            Kid Long
          </a>
          <div className="top-nav__links">
            <a href="#work">Work</a>
            <a href="#experience">Info</a>
            <a href="#contact">Connect</a>
          </div>
          <a className="top-nav__talk" href="#contact">
            Let&apos;s Talk
          </a>
        </nav>

        <div className="hero__content">
          <h1>
            Design for Business
            <br />
            Momentum
          </h1>
          <p>以视觉系统、上市传播与用户体验，推动品牌认知与业务转化</p>
          <div className="hero__actions">
            <a className="button button--light" href="#work">
              View selected work
              <ArrowDown aria-hidden="true" size={14} weight="regular" />
            </a>
            <CopyButton
              className="wechat-pill"
              value="LKchat1980"
              label="Wechat: LKchat1980"
              copiedLabel="已复制微信号"
              trackLabel="Wechat: LKchat1980"
            />
          </div>
        </div>
      </section>

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

        <section
          className="contact"
          id="contact"
          data-track-section
          data-track-label="LET’S TALK"
        >
          <div className="contact__content">
            <h2>LET&apos;S TALK</h2>
            <p className="contact__details">
              <a href="mailto:long.kidq@gmail.com">
                E-mail：long.kidq@gmail.com
              </a>
              <span aria-hidden="true">|</span>
              <span>Wechat：LKchat1980</span>
              <span aria-hidden="true">|</span>
              <a href="tel:+8618520224719">Mobile：18520224719</a>
            </p>
            <CopyButton
              className="button button--light contact__button"
              value="long.kidq@gmail.com"
              label="start a conversation"
              copiedLabel="已复制邮箱"
              trackLabel="start a conversation"
              showArrow
            />
          </div>
          <footer className="footer">
            <span>© 2026 Kid Long · 龙昊翔</span>
            <span>AIGC × Visual Design Expert</span>
          </footer>
        </section>
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

import { useEffect, useRef, useState } from "react";

import { caseStudies } from "./case-study-manifest.js";
import {
  activateModalEnvironment,
  getCaseStudy,
  getCaseStudyAccessibility,
  getRetrySliceSource,
  handleCaseStudyBackdrop,
  handleCaseStudyKeyDown,
  nextSliceRetryState,
} from "./case-study-model.js";
import { getPortfolioAnalytics } from "./posthog-analytics.js";

export function CaseStudyModal({
  caseId,
  title,
  onClose,
  backgroundRef,
  returnFocusRef,
  previousProject,
  nextProject,
  onSelectCase,
  standalone = false,
}) {
  const caseStudy = getCaseStudy(caseStudies, caseId);
  const accessibility = getCaseStudyAccessibility(title);
  const summaryId = "case-study-summary";
  const modalRef = useRef(null);
  const closeButtonRef = useRef(null);
  const summaryRef = useRef(null);
  const visualsRef = useRef(null);
  const caseViewIdRef = useRef(null);
  const [sliceStates, setSliceStates] = useState({});

  useEffect(() => {
    setSliceStates({});
    if (standalone) {
      window.scrollTo?.({ top: 0 });
    } else {
      modalRef.current?.scrollTo?.({ top: 0 });
    }
    caseViewIdRef.current = caseId
      ? (globalThis.crypto?.randomUUID?.() ?? `${caseId}-${Date.now()}`)
      : null;
  }, [caseId, standalone]);

  useEffect(() => {
    if (!caseStudy || (!standalone && !modalRef.current)) return undefined;
    const scroller = standalone ? window : modalRef.current;
    const analytics = getPortfolioAnalytics();
    const dwell = Array.from({ length: 12 }, () => 0);
    let lastSampleAt = performance.now();
    let activeDwellMs = 0;
    let maxDepth = 0;

    const sample = () => {
      const now = performance.now();
      const elapsed = document.visibilityState === "hidden" ? 0 : now - lastSampleAt;
      lastSampleAt = now;
      activeDwellMs += elapsed;
      const scrollHeight = standalone
        ? document.documentElement.scrollHeight
        : scroller.scrollHeight;
      const clientHeight = standalone ? window.innerHeight : scroller.clientHeight;
      const scrollTop = standalone ? window.scrollY : scroller.scrollTop;
      const scrollable = Math.max(scrollHeight - clientHeight, 1);
      const depth = Math.min(100, Math.round((scrollTop / scrollable) * 100));
      maxDepth = Math.max(maxDepth, depth);
      const center = scrollTop + clientHeight / 2;
      const segment = Math.min(11, Math.max(0, Math.floor((center / Math.max(scrollHeight, 1)) * 12)));
      dwell[segment] += elapsed;
    };
    const report = () => {
      sample();
      analytics.capture("portfolio_case_progress", {
        project_id: caseStudy.id,
        project_label: title,
        case_view_id: caseViewIdRef.current,
        max_scroll_depth: maxDepth,
        active_dwell_ms: Math.round(activeDwellMs),
        segment_dwell_ms: dwell.map(Math.round),
      });
    };
    const onScroll = () => sample();
    const onVisibility = () => sample();
    scroller.addEventListener("scroll", onScroll, { passive: true });
    document.addEventListener("visibilitychange", onVisibility);
    const heartbeat = window.setInterval(report, 15_000);
    report();
    return () => {
      report();
      scroller.removeEventListener("scroll", onScroll);
      document.removeEventListener("visibilitychange", onVisibility);
      window.clearInterval(heartbeat);
    };
  }, [caseStudy, standalone, title]);

  useEffect(() => {
    if (!caseStudy || standalone) return undefined;

    const handleKeyDown = (event) => {
      handleCaseStudyKeyDown({
        event,
        modalElement: modalRef.current,
        onClose,
      });
    };
    const restoreEnvironment = activateModalEnvironment({
      backgroundElement: backgroundRef?.current,
      body: document.body,
      returnFocusElement: returnFocusRef?.current ?? document.activeElement,
    });

    document.addEventListener("keydown", handleKeyDown);
    closeButtonRef.current?.focus();

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      restoreEnvironment();
    };
  }, [backgroundRef, caseStudy, onClose, returnFocusRef, standalone]);

  if (!caseStudy) return null;

  const handleBackdropClick = (event) => {
    handleCaseStudyBackdrop({ event, onClose });
  };

  const retrySlice = (index) => {
    setSliceStates((currentStates) => ({
      ...currentStates,
      [index]: nextSliceRetryState(currentStates[index]),
    }));
  };

  const jumpTo = (targetRef) => {
    targetRef.current?.scrollIntoView?.({
      behavior: "smooth",
      block: "start",
    });
  };

  return (
    <div
      ref={modalRef}
      className={`case-study${standalone ? " case-study--page" : ""}`}
      role={standalone ? undefined : "dialog"}
      aria-modal={standalone ? undefined : "true"}
      aria-labelledby={accessibility.titleId}
      aria-describedby={summaryId}
      onClick={standalone ? undefined : handleBackdropClick}
    >
      <div className="case-study__document">
        {standalone ? (
          <a className="case-study__close" href="/#work">
            返回作品概览
          </a>
        ) : (
          <button
            ref={closeButtonRef}
            className="case-study__close"
            type="button"
            onClick={onClose}
            aria-label="关闭案例"
          >
            关闭 ×
          </button>
        )}
        <header className="case-study__overview" ref={summaryRef}>
          <p className="case-study__eyebrow">PROJECT OVERVIEW</p>
          <h2
            className="case-study__heading"
            id={accessibility.titleId}
          >
            {accessibility.title}
          </h2>
          <nav className="case-study__toc" aria-label="案例章节">
            <button type="button" onClick={() => jumpTo(summaryRef)}>
              Overview
            </button>
            <button type="button" onClick={() => jumpTo(visualsRef)}>
              Visual Story
            </button>
          </nav>
          <div className="case-study__summary" id={summaryId}>
            <dl>
              <div>
                <dt>项目背景</dt>
                <dd>{caseStudy.summary.background}</dd>
              </div>
              <div>
                <dt>我的职责</dt>
                <dd>{caseStudy.summary.responsibility}</dd>
              </div>
              <div>
                <dt>项目成果</dt>
                <dd>{caseStudy.summary.outcome}</dd>
              </div>
            </dl>
          </div>
        </header>
        <div
          className="case-study__visuals"
          ref={visualsRef}
          aria-label="案例视觉展示"
        >
        {!sliceStates[0]?.loaded && !sliceStates[0]?.error && (
          <div className="case-study__loading" role="status">
            正在加载案例
          </div>
        )}
        {caseStudy.slices.map((slice, index) => {
          const sliceState = sliceStates[index] ?? {};
          const source = getRetrySliceSource(slice.src, sliceState.retry);
          const imageProps = {
            src: source,
            ...accessibility.imageAttributes,
            onLoad: () =>
              setSliceStates((currentStates) => ({
                ...currentStates,
                [index]: { ...currentStates[index], loaded: true },
              })),
            onError: () =>
              setSliceStates((currentStates) => ({
                ...currentStates,
                [index]: { ...currentStates[index], error: true },
              })),
          };

          return (
            <div
              className="case-study__slice"
              key={slice.src}
            >
              {sliceState.error ? (
                <button
                  className="case-study__retry"
                  type="button"
                  onClick={() => retrySlice(index)}
                >
                  图片加载失败，重试
                </button>
              ) : (
                <>
                  {index === 0 ? (
                    <img
                      {...imageProps}
                      width={slice.width}
                      height={slice.height}
                      loading="eager"
                    />
                  ) : (
                    <img
                      {...imageProps}
                      width={slice.width}
                      height={slice.height}
                      loading="lazy"
                    />
                  )}
                </>
              )}
            </div>
          );
        })}
        </div>
        <nav className="case-study__pager" aria-label="案例切换">
          {previousProject ? (
            <button
              type="button"
              onClick={() => onSelectCase(previousProject.caseId)}
              aria-label={`查看上一个案例：${previousProject.title}`}
            >
              <span>PREVIOUS</span>
              <strong>{previousProject.title}</strong>
            </button>
          ) : (
            <span aria-hidden="true" />
          )}
          <button
            className="case-study__overview-return"
            type="button"
            onClick={onClose}
          >
            返回作品概览
          </button>
          {nextProject ? (
            <button
              type="button"
              onClick={() => onSelectCase(nextProject.caseId)}
              aria-label={`查看下一个案例：${nextProject.title}`}
            >
              <span>NEXT</span>
              <strong>{nextProject.title}</strong>
            </button>
          ) : (
            <span aria-hidden="true" />
          )}
        </nav>
      </div>
    </div>
  );
}

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
}) {
  const caseStudy = getCaseStudy(caseStudies, caseId);
  const accessibility = getCaseStudyAccessibility(title);
  const summaryId = "case-study-summary";
  const modalRef = useRef(null);
  const closeButtonRef = useRef(null);
  const caseViewIdRef = useRef(null);
  const [sliceStates, setSliceStates] = useState({});

  useEffect(() => {
    setSliceStates({});
    caseViewIdRef.current = caseId
      ? (globalThis.crypto?.randomUUID?.() ?? `${caseId}-${Date.now()}`)
      : null;
  }, [caseId]);

  useEffect(() => {
    if (!caseStudy || !modalRef.current) return undefined;
    const scroller = modalRef.current;
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
      const scrollable = Math.max(scroller.scrollHeight - scroller.clientHeight, 1);
      const depth = Math.min(100, Math.round((scroller.scrollTop / scrollable) * 100));
      maxDepth = Math.max(maxDepth, depth);
      const center = scroller.scrollTop + scroller.clientHeight / 2;
      const segment = Math.min(11, Math.max(0, Math.floor((center / Math.max(scroller.scrollHeight, 1)) * 12)));
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
  }, [caseStudy, title]);

  useEffect(() => {
    if (!caseStudy) return undefined;

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
  }, [backgroundRef, caseStudy, onClose, returnFocusRef]);

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

  return (
    <div
      ref={modalRef}
      className="case-study"
      role="dialog"
      aria-modal="true"
      aria-labelledby={accessibility.titleId}
      aria-describedby={summaryId}
      onClick={handleBackdropClick}
    >
      <div className="case-study__document">
        <h2
          className="case-study__heading"
          id={accessibility.titleId}
        >
          {accessibility.title}
        </h2>
        <div className="case-study__summary" id={summaryId}>
          <dl>
            <dt>项目背景</dt>
            <dd>{caseStudy.summary.background}</dd>
            <dt>我的职责</dt>
            <dd>{caseStudy.summary.responsibility}</dd>
            <dt>项目成果</dt>
            <dd>{caseStudy.summary.outcome}</dd>
          </dl>
        </div>
        <button
          ref={closeButtonRef}
          className="case-study__close"
          type="button"
          onClick={onClose}
          aria-label="关闭案例"
        >
          关闭 ×
        </button>
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
    </div>
  );
}

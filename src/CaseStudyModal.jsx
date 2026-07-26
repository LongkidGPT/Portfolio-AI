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

export function CaseStudyModal({
  caseId,
  title,
  onClose,
  backgroundRef,
  returnFocusRef,
}) {
  const caseStudy = getCaseStudy(caseStudies, caseId);
  const accessibility = getCaseStudyAccessibility(title);
  const modalRef = useRef(null);
  const closeButtonRef = useRef(null);
  const [sliceStates, setSliceStates] = useState({});

  useEffect(() => {
    setSliceStates({});
  }, [caseId]);

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
      onClick={handleBackdropClick}
    >
      <div className="case-study__document">
        <h2
          className="case-study__heading"
          id={accessibility.titleId}
        >
          {accessibility.title}
        </h2>
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
              style={{ aspectRatio: `${slice.width} / ${slice.height}` }}
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
                    <img {...imageProps} loading="eager" />
                  ) : (
                    <img {...imageProps} loading="lazy" />
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

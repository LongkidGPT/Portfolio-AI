import { useEffect, useRef, useState } from "react";

import { caseStudies } from "./case-study-manifest.js";
import { getCaseStudy, shouldDismissCaseStudy } from "./case-study-model.js";

export function CaseStudyModal({ caseId, title, onClose }) {
  const caseStudy = getCaseStudy(caseStudies, caseId);
  const closeButtonRef = useRef(null);
  const [sliceStates, setSliceStates] = useState({});

  useEffect(() => {
    setSliceStates({});
  }, [caseId]);

  useEffect(() => {
    if (!caseStudy) return undefined;

    const activeElement = document.activeElement;
    const originalOverflow = document.body.style.overflow;
    const handleKeyDown = (event) => {
      if (shouldDismissCaseStudy({ type: event.type, key: event.key })) {
        onClose();
      }
    };

    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", handleKeyDown);
    closeButtonRef.current?.focus();

    return () => {
      document.body.style.overflow = originalOverflow;
      document.removeEventListener("keydown", handleKeyDown);
      activeElement?.focus?.();
    };
  }, [caseStudy, onClose]);

  if (!caseStudy) return null;

  const handleBackdropClick = (event) => {
    const isBackdrop = event.target === event.currentTarget;
    if (shouldDismissCaseStudy({ type: "backdrop", isBackdrop })) {
      onClose();
    }
  };

  const retrySlice = (index) => {
    setSliceStates((currentStates) => ({
      ...currentStates,
      [index]: {
        error: false,
        retry: (currentStates[index]?.retry ?? 0) + 1,
      },
    }));
  };

  return (
    <div
      className="case-study"
      role="dialog"
      aria-modal="true"
      aria-label={title || "项目案例"}
      onClick={handleBackdropClick}
    >
      <div className="case-study__document">
        <button
          ref={closeButtonRef}
          className="case-study__close"
          type="button"
          onClick={() => onClose()}
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
          const source = sliceState.retry
            ? `${slice.src}?retry=${sliceState.retry}`
            : slice.src;
          const imageProps = {
            src: source,
            alt: `${title}，第 ${index + 1} 张`,
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

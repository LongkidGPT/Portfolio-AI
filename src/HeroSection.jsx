import { ArrowDown } from "@phosphor-icons/react";
import { useCallback, useRef, useState } from "react";

import { CopyButton } from "./CopyButton.jsx";
import { heroFeatures } from "./hero-features.js";
import { HeroTypewriter } from "./HeroTypewriter.jsx";
import { useCycleSpatialView } from "./use-cycle-spatial-view.js";
import { useHeroScrollScrub } from "./use-hero-scroll-scrub.js";

export function HeroSection() {
  const heroRef = useRef(null);
  const videoRef = useRef(null);
  const cycleVideoRef = useRef(null);
  const [typewriterComplete, setTypewriterComplete] = useState(false);
  const cycleEnabled = heroFeatures.cycleSpatialView;
  const {
    heroState,
    completeReveal,
    failMedia,
    releaseHero,
  } = useHeroScrollScrub({ videoRef });
  useCycleSpatialView({
    heroRef,
    videoRef: cycleVideoRef,
    active:
      cycleEnabled && ["revealed", "released"].includes(heroState),
  });
  const completeTypewriter = useCallback(
    () => setTypewriterComplete(true),
    [],
  );

  const handleHeroNavigation = (event) => {
    const anchor = event.target.closest("a[href^='#']");
    if (!anchor || anchor.getAttribute("href") === "#hero") return;

    if (["ready", "scrubbing", "resolving"].includes(heroState)) {
      event.preventDefault();
      return;
    }

    if (heroState === "revealed") {
      releaseHero();
    }
  };

  const handleRevealAnimationEnd = (event) => {
    if (event.animationName === "hero-wechat-in") {
      completeReveal();
    }
  };
  const contentIsHidden = ["ready", "scrubbing", "resolving"].includes(
    heroState,
  );

  return (
    <section
      ref={heroRef}
      className={`hero hero--${heroState}${
        typewriterComplete ? " hero--type-complete" : ""
      }`}
      id="hero"
      data-track-section
      data-track-label="HERO"
    >
      <div className="hero__stage" aria-hidden="true">
        <video
          ref={videoRef}
          className="hero__video"
          src="/assets/hero-bg-optimized.mp4"
          poster="/assets/hero-first-frame.webp"
          muted
          playsInline
          preload="auto"
          onError={failMedia}
        />
        <img
          className="hero__final-scene"
          src="/assets/hero-poster.webp"
          alt=""
          loading="eager"
          decoding="async"
          fetchPriority="high"
          onError={() =>
            heroRef.current?.classList.add("hero--poster-failed")
          }
        />
        {cycleEnabled && (
          <video
            ref={cycleVideoRef}
            className="hero__cycle-scene"
            src="/assets/hero-cycle-front.mp4"
            poster="/assets/hero-poster.webp"
            muted
            playsInline
            preload="auto"
            aria-hidden="true"
            onError={() =>
              heroRef.current?.classList.add("hero--cycle-failed")
            }
          />
        )}
      </div>
      <div className="hero__scrim" aria-hidden="true" />

      <nav
        className="top-nav"
        aria-label="主导航"
        onClick={handleHeroNavigation}
      >
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

      <div
        className="hero__content"
        inert={contentIsHidden ? true : undefined}
        aria-hidden={contentIsHidden ? true : undefined}
      >
        <HeroTypewriter
          active={["resolving", "revealed", "released"].includes(
            heroState,
          )}
          onComplete={completeTypewriter}
        />
        <p>以视觉系统、上市传播与用户体验，推动品牌认知与业务转化</p>
        <div className="hero__actions" onClick={handleHeroNavigation}>
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
            onAnimationEnd={handleRevealAnimationEnd}
          />
        </div>
      </div>
    </section>
  );
}

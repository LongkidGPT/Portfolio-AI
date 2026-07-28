import { ArrowDown } from "@phosphor-icons/react";
import { useEffect, useRef } from "react";

import { CopyButton } from "./CopyButton.jsx";
import {
  normalizeHeroPointer,
  resolveHeroParallax,
  resolvePointerLight,
} from "./hero-parallax.js";
import { useHeroScrollScrub } from "./use-hero-scroll-scrub.js";

const NEUTRAL_POINTER = {
  x: 0,
  y: 0,
  percentX: 50,
  percentY: 50,
  lightScale: 0.96,
  lightOpacity: 0,
};

export function HeroSection() {
  const heroRef = useRef(null);
  const videoRef = useRef(null);
  const {
    heroState,
    completeReveal,
    failMedia,
    releaseHero,
  } = useHeroScrollScrub({ videoRef });
  const pointerTargetRef = useRef({ ...NEUTRAL_POINTER });
  const pointerCurrentRef = useRef({ ...pointerTargetRef.current });
  const pointerEnabledRef = useRef(false);
  const previousPointerRef = useRef(null);

  useEffect(() => {
    const hero = heroRef.current;
    if (!hero) return undefined;

    const coarsePointerQuery = window.matchMedia("(pointer: coarse)");
    const compactViewportQuery = window.matchMedia("(max-width: 760px)");
    let frameId = 0;

    const resetPointer = () => {
      pointerTargetRef.current = { ...NEUTRAL_POINTER };
      pointerCurrentRef.current = { ...NEUTRAL_POINTER };
      previousPointerRef.current = null;
      hero.style.setProperty("--stage-x", "0px");
      hero.style.setProperty("--stage-y", "0px");
      hero.style.setProperty("--stage-rx", "0deg");
      hero.style.setProperty("--stage-ry", "0deg");
      hero.style.setProperty("--stage-scale", 1.04);
      hero.style.setProperty("--light-x", "50%");
      hero.style.setProperty("--light-y", "50%");
      hero.style.setProperty("--light-scale", 0.96);
      hero.style.setProperty("--light-opacity", 0);
    };

    const renderPointer = () => {
      frameId = 0;
      if (!pointerEnabledRef.current) return;

      const current = pointerCurrentRef.current;
      const target = pointerTargetRef.current;

      for (const key of Object.keys(current)) {
        current[key] += (target[key] - current[key]) * 0.14;
      }

      const transform = resolveHeroParallax(current);
      hero.style.setProperty("--stage-x", `${transform.translateX}px`);
      hero.style.setProperty("--stage-y", `${transform.translateY}px`);
      hero.style.setProperty("--stage-rx", `${transform.rotateX}deg`);
      hero.style.setProperty("--stage-ry", `${transform.rotateY}deg`);
      hero.style.setProperty("--stage-scale", transform.scale);
      hero.style.setProperty("--light-x", `${current.percentX}%`);
      hero.style.setProperty("--light-y", `${current.percentY}%`);
      hero.style.setProperty("--light-scale", current.lightScale);
      hero.style.setProperty("--light-opacity", current.lightOpacity);
      frameId = window.requestAnimationFrame(renderPointer);
    };

    const handlePointerModeChange = () => {
      const enabled =
        !coarsePointerQuery.matches && !compactViewportQuery.matches;
      pointerEnabledRef.current = enabled;

      if (!enabled) {
        if (frameId !== 0) {
          window.cancelAnimationFrame(frameId);
          frameId = 0;
        }
        resetPointer();
        return;
      }

      if (frameId === 0) {
        frameId = window.requestAnimationFrame(renderPointer);
      }
    };

    coarsePointerQuery.addEventListener("change", handlePointerModeChange);
    compactViewportQuery.addEventListener("change", handlePointerModeChange);
    handlePointerModeChange();

    return () => {
      pointerEnabledRef.current = false;
      if (frameId !== 0) {
        window.cancelAnimationFrame(frameId);
      }
      coarsePointerQuery.removeEventListener("change", handlePointerModeChange);
      compactViewportQuery.removeEventListener(
        "change",
        handlePointerModeChange,
      );
    };
  }, []);

  const handlePointerMove = (event) => {
    const hero = heroRef.current;
    if (!hero) return;
    if (!pointerEnabledRef.current) return;

    const normalized = normalizeHeroPointer(
      event,
      hero.getBoundingClientRect(),
    );
    const now = performance.now();
    const previous = previousPointerRef.current ?? {
      clientX: event.clientX,
      clientY: event.clientY,
      time: now,
    };
    const light = resolvePointerLight(
      previous,
      event,
      now - previous.time,
    );

    pointerTargetRef.current = {
      ...normalized,
      lightScale: light.scale,
      lightOpacity: light.opacity,
    };
    previousPointerRef.current = {
      clientX: event.clientX,
      clientY: event.clientY,
      time: now,
    };
  };

  const handlePointerLeave = () => {
    pointerTargetRef.current = { ...NEUTRAL_POINTER };
    previousPointerRef.current = null;
  };

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

  return (
    <section
      ref={heroRef}
      className={`hero hero--${heroState}`}
      id="hero"
      data-track-section
      data-track-label="HERO"
      onPointerMove={handlePointerMove}
      onPointerLeave={handlePointerLeave}
    >
      <div className="hero__stage" aria-hidden="true">
        <video
          ref={videoRef}
          className="hero__video"
          src="/assets/hero-bg-optimized.mp4"
          poster="/assets/hero-first-frame.webp"
          muted
          playsInline
          preload="metadata"
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
      </div>
      <img
        className="hero__pointer-light"
        src="/assets/hero-light-spot.png"
        alt=""
        aria-hidden="true"
        onError={(event) =>
          event.currentTarget.classList.add("is-unavailable")
        }
      />
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

      <div className="hero__content">
        <h1>
          Design for Business
          <br />
          Momentum
        </h1>
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

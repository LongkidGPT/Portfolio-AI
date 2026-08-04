import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("HeroSection keeps the spatial-view integration behind a disabled feature flag", async () => {
  const [source, features] = await Promise.all([
    readFile(new URL("../src/HeroSection.jsx", import.meta.url), "utf8"),
    readFile(new URL("../src/hero-features.js", import.meta.url), "utf8"),
  ]);

  assert.match(source, /className="hero__stage"/);
  assert.match(source, /className="hero__video"/);
  assert.match(source, /className="hero__final-scene"/);
  assert.match(source, /className="hero__cycle-scene"/);
  assert.match(source, /\/assets\/hero-first-frame\.webp/);
  assert.match(source, /\/assets\/hero-cycle-front\.mp4/);
  assert.match(source, /useCycleSpatialView/);
  assert.match(source, /heroFeatures\.cycleSpatialView/);
  assert.match(features, /cycleSpatialView:\s*false/);
  assert.doesNotMatch(source, /hero__distortion/);
  assert.doesNotMatch(source, /\.play\(/);
});

test("scrub hook installs cancellable desktop, touch, and keyboard input", async () => {
  const source = await readFile(
    new URL("../src/use-hero-scroll-scrub.js", import.meta.url),
    "utf8",
  );

  assert.match(
    source,
    /addEventListener\("wheel", handleWheel, \{ passive: false \}\)/,
  );
  assert.match(
    source,
    /addEventListener\("touchmove", handleTouchMove, \{ passive: false \}\)/,
  );
  assert.match(source, /addEventListener\("keydown", handleKeyDown\)/);
  assert.match(source, /removeEventListener\("wheel", handleWheel\)/);
  assert.match(source, /removeEventListener\("touchmove", handleTouchMove\)/);
  assert.match(source, /removeEventListener\("keydown", handleKeyDown\)/);
  assert.match(source, /requestAnimationFrame/);
  assert.match(source, /requestVideoFrameCallback/);
  assert.match(source, /4000/);
});

test("scrub waits for the final requested video frame to be presented", async () => {
  const source = await readFile(
    new URL("../src/use-hero-scroll-scrub.js", import.meta.url),
    "utf8",
  );

  assert.match(source, /lastPresentedTime/);
  assert.match(
    source,
    /requestVideoFrameCallback\(\(\) => \{[\s\S]*?lastPresentedTime = nextTime/,
  );
  assert.match(source, /Math\.round\(rendered \* finalUsableTime \* HERO_VIDEO_FPS\)/);
  assert.match(source, /requestSeek\(frameTime, rendered, timestamp\)/);
  assert.match(
    source,
    /lastPresentedTime >=[\s\S]*?finalUsableTime - 1 \/ \(HERO_VIDEO_FPS \* 2\)/,
  );
});

test("App delegates the Hero without changing the remaining page sections", async () => {
  const [source, contactSource] = await Promise.all([
    readFile(new URL("../src/App.jsx", import.meta.url), "utf8"),
    readFile(new URL("../src/ContactSection.jsx", import.meta.url), "utf8"),
  ]);

  assert.match(source, /<HeroSection \/>/);
  assert.doesNotMatch(source, /attemptPlayback/);
  for (const id of ["approach", "work"]) {
    assert.match(source, new RegExp(`id="${id}"`));
  }
  assert.match(source, /<ContactSection \/>/);
  assert.match(contactSource, /id="contact"/);
});

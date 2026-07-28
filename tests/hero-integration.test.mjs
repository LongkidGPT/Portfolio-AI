import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("HeroSection uses one shared visual stage and supplied assets", async () => {
  const source = await readFile(
    new URL("../src/HeroSection.jsx", import.meta.url),
    "utf8",
  );

  assert.match(source, /className="hero__stage"/);
  assert.match(source, /className="hero__video"/);
  assert.match(source, /className="hero__final-scene"/);
  assert.match(source, /className="hero__pointer-light"/);
  assert.match(source, /\/assets\/hero-first-frame\.webp/);
  assert.match(source, /\/assets\/hero-light-spot\.png/);
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

  assert.match(source, /lastPresentedProgress/);
  assert.match(
    source,
    /requestVideoFrameCallback\(\(\) => \{[\s\S]*?lastPresentedProgress = requestedProgress/,
  );
  assert.match(source, /requestSeek\(rendered \* finalUsableTime, rendered\)/);
  assert.match(
    source,
    /rendered >= 0\.999 &&[\s\S]*?lastPresentedProgress === 1 &&/,
  );
});

test("HeroSection disables and restores pointer RAF when media queries change", async () => {
  const source = await readFile(
    new URL("../src/HeroSection.jsx", import.meta.url),
    "utf8",
  );

  assert.equal(
    source.match(/addEventListener\("change", handlePointerModeChange\)/g)
      ?.length,
    2,
  );
  assert.equal(
    source.match(
      /removeEventListener\(\s*"change",\s*handlePointerModeChange,?\s*\)/g,
    )?.length,
    2,
  );
  assert.match(source, /pointerEnabledRef\.current/);
  assert.match(source, /window\.cancelAnimationFrame\(frameId\)/);
  assert.match(source, /hero\.style\.setProperty\("--stage-x", "0px"\)/);
  assert.match(source, /hero\.style\.setProperty\("--light-opacity", 0\)/);
});

test("App delegates the Hero without changing the remaining page sections", async () => {
  const source = await readFile(
    new URL("../src/App.jsx", import.meta.url),
    "utf8",
  );

  assert.match(source, /<HeroSection \/>/);
  assert.doesNotMatch(source, /attemptPlayback/);
  for (const id of ["approach", "work", "contact"]) {
    assert.match(source, new RegExp(`id="${id}"`));
  }
});

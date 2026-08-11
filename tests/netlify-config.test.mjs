import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("Netlify builds and publishes the Vite client with SPA fallback", async () => {
  const config = await readFile(
    new URL("../netlify.toml", import.meta.url),
    "utf8",
  );

  assert.match(config, /\[build\][\s\S]*command\s*=\s*"npm run build"/);
  assert.match(config, /\[build\][\s\S]*publish\s*=\s*"dist\/client"/);
  assert.match(
    config,
    /\[\[redirects\]\][\s\S]*from\s*=\s*"\/\*"[\s\S]*to\s*=\s*"\/index\.html"[\s\S]*status\s*=\s*200/,
  );
});

test("the shared-link site opts out of search indexing", async () => {
  const [config, index, robots] = await Promise.all([
    readFile(new URL("../netlify.toml", import.meta.url), "utf8"),
    readFile(new URL("../index.html", import.meta.url), "utf8"),
    readFile(new URL("../public/robots.txt", import.meta.url), "utf8"),
  ]);

  assert.match(
    config,
    /\[\[headers\]\][\s\S]*for\s*=\s*"\/\*"[\s\S]*X-Robots-Tag\s*=\s*"noindex, nofollow, noarchive"/,
  );
  assert.match(
    index,
    /<meta\s+name="robots"\s+content="noindex, nofollow, noarchive"\s*\/>/,
  );
  assert.match(robots, /User-agent:\s*\*[\s\S]*Disallow:\s*\//);
});

test("Netlify separates immutable build assets from replaceable media", async () => {
  const config = await readFile(
    new URL("../netlify.toml", import.meta.url),
    "utf8",
  );

  assert.match(
    config,
    /for\s*=\s*"\/_app\/\*"[\s\S]*Cache-Control\s*=\s*"public, max-age=31536000, immutable"/,
  );
  assert.match(
    config,
    /for\s*=\s*"\/assets\/\*"[\s\S]*Cache-Control\s*=\s*"public, max-age=3600, stale-while-revalidate=86400"/,
  );
});

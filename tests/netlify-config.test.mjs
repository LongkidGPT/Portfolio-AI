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

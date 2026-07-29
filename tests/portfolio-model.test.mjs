import assert from "node:assert/strict";
import test from "node:test";

import { experience, principles, projects } from "../src/portfolio-data.js";

test("portfolio model exposes the five approach principles", () => {
  assert.equal(principles.length, 5);
  assert.deepEqual(
    principles.map((item) => item.number),
    ["01", "02", "03", "04", "05"],
  );
});

test("each project defines independent default and hover imagery", () => {
  assert.equal(projects.length, 3);
  assert.equal(new Set(projects.map((project) => project.id)).size, 3);

  for (const project of projects) {
    assert.notEqual(project.defaultImage, project.hoverImage);
    assert.match(project.defaultImage, /^\/assets\//);
    assert.match(project.hoverImage, /^\/assets\//);
  }
});

test("each project maps to a case and exposes a stable artwork ratio", () => {
  assert.deepEqual(
    projects.map(
      ({ id, caseId, artworkRatio, temporaryArtworkRatio }) => [
        id,
        caseId,
        artworkRatio,
        temporaryArtworkRatio,
      ],
    ),
    [
      ["brand", "brand", "3600 / 1860", "3600 / 1246"],
      ["marketing", "marketing", "1748 / 1602", "1748 / 929"],
      ["system", "system", "1748 / 1602", "1748 / 929"],
    ],
  );
});

test("experience model matches the five visible career rows", () => {
  assert.equal(experience.length, 5);
  assert.equal(experience[0].company, "安克创新 Anker Innovations");
  assert.equal(experience[2].company, "熠思霆创意 Extend");
});

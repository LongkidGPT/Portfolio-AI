# Portfolio Detail Refinement Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Refine the existing portfolio homepage to match the approved desktop/mobile references, replace unstable raster-owned card copy with responsive DOM composition, and open three optimized long-form case studies in an accessible 860px modal.

**Architecture:** Keep `App.jsx` as the page orchestrator while extracting project cards, case-study modal behavior, and Experience markup into focused components. Generate deterministic WebP slices and a JavaScript manifest at build time from the three untouched source PNGs; render the slices lazily inside a full-viewport modal. Preserve the existing visitor analytics store and click aggregation, changing only the displayed anonymized label.

**Tech Stack:** React 19, Vite 6, CSS, Node.js built-in test runner, local `cwebp` CLI, existing Phosphor icons.

## Global Constraints

- Do not deploy to Netlify, Sites, or another host in this iteration.
- Keep the source PNG files untouched.
- Case-study desktop content width is exactly `860px`.
- Case-study mobile content width is `calc(100vw - 24px)`.
- Case-study output width is at most `1720px`; do not upscale the `1630px` marketing source.
- WebP slices use quality `82`, strip metadata, and are at most `4096px` high after resizing.
- Supported layout ranges are desktop `>= 1024px`, tablet `761px–1023px`, and mobile `320px–760px`.
- Verify browser zoom at `80%`, `100%`, `125%`, and `150%`.
- The visible anonymized viewer label is exactly `VISITOR`; visit numbering remains `VISIT 01`, `VISIT 02`, and so on.
- Existing page tracking, copy feedback, sticky Hero behavior, and independent project hover behavior must remain functional.

## File Structure

- `scripts/case-study-pipeline.mjs`: pure planning and manifest-generation functions for deterministic image slicing.
- `scripts/convert-case-studies.mjs`: executable wrapper that validates the three PNGs and invokes `cwebp`.
- `src/case-study-manifest.js`: generated runtime metadata with ordered slice paths and dimensions.
- `public/assets/cases/{brand,marketing,system}/slice-NN.webp`: generated case-study slices.
- `src/case-study-model.js`: pure lookup and dismissal rules used by the modal.
- `src/CaseStudyModal.jsx`: accessible overlay, lazy slices, loading/retry UI, focus restoration, and scroll locking.
- `src/ProjectCard.jsx`: DOM-owned frame, art layers, copy panel, arrow, hover, and case-open control.
- `src/ExperienceSection.jsx`: editorial Experience layout and career list.
- `src/App.jsx`: selected-case state and composition of extracted components.
- `src/portfolio-data.js`: project-to-case mapping and artwork metadata.
- `src/visitor-monitor-model.js`: normalize the public viewer label to `VISITOR`.
- `src/styles.css`: navigation gradient, shared spacing tokens, project cards, modal, Experience layout, and responsive/zoom rules.
- `tests/case-study-pipeline.test.mjs`: deterministic sizing/order/manifest tests.
- `tests/case-study-model.test.mjs`: lookup and dismissal behavior tests.
- `tests/page-shell.test.mjs`: component wiring and CSS contract checks.
- `tests/portfolio-model.test.mjs`: project case IDs and artwork contract.
- `tests/visitor-monitor.test.mjs`: fixed visitor label behavior.

---

### Task 1: Deterministic WebP Case-Study Pipeline

**Files:**
- Create: `scripts/case-study-pipeline.mjs`
- Create: `scripts/convert-case-studies.mjs`
- Create: `tests/case-study-pipeline.test.mjs`
- Generate: `src/case-study-manifest.js`
- Generate: `public/assets/cases/brand/slice-01.webp` through the calculated final slice
- Generate: `public/assets/cases/marketing/slice-01.webp` through the calculated final slice
- Generate: `public/assets/cases/system/slice-01.webp` through the calculated final slice
- Modify: `package.json`

**Interfaces:**
- Consumes: source definitions `{ id, filename, width, height }` and options `{ maxWidth, maxSliceHeight, quality }`.
- Produces: `buildCaseStudyPlan(source, options) -> { id, outputWidth, outputHeight, slices }`.
- Produces: `renderCaseStudyManifest(plans) -> string`.
- Produces: named export `caseStudies` from `src/case-study-manifest.js`, shaped as `{ [id]: { id, slices: Array<{ src, width, height }> } }`.

- [ ] **Step 1: Write failing sizing and ordering tests**

```js
import assert from "node:assert/strict";
import test from "node:test";

import {
  buildCaseStudyPlan,
  renderCaseStudyManifest,
} from "../scripts/case-study-pipeline.mjs";

test("brand is resized to 1720px and split into ordered slices no taller than 4096px", () => {
  const plan = buildCaseStudyPlan(
    { id: "brand", filename: "品牌系统-案例.png", width: 2656, height: 32768 },
    { maxWidth: 1720, maxSliceHeight: 4096, quality: 82 },
  );

  assert.equal(plan.outputWidth, 1720);
  assert.equal(plan.outputHeight, Math.round((32768 * 1720) / 2656));
  assert.ok(plan.slices.length > 1);
  assert.equal(
    plan.slices.reduce((sum, slice) => sum + slice.height, 0),
    plan.outputHeight,
  );
  assert.ok(plan.slices.every((slice) => slice.height <= 4096));
  assert.deepEqual(
    plan.slices.map((slice) => slice.filename),
    plan.slices.map((_, index) => `slice-${String(index + 1).padStart(2, "0")}.webp`),
  );
});

test("marketing source is never upscaled", () => {
  const plan = buildCaseStudyPlan(
    { id: "marketing", filename: "营销全案-案例.png", width: 1630, height: 32768 },
    { maxWidth: 1720, maxSliceHeight: 4096, quality: 82 },
  );

  assert.equal(plan.outputWidth, 1630);
  assert.equal(plan.outputHeight, 32768);
});

test("manifest contains ordered public paths and reserved dimensions", () => {
  const plan = buildCaseStudyPlan(
    { id: "system", filename: "系统架构-案例.png", width: 3215, height: 32768 },
    { maxWidth: 1720, maxSliceHeight: 4096, quality: 82 },
  );
  const source = renderCaseStudyManifest([plan]);

  assert.match(source, /export const caseStudies/);
  assert.match(source, /\/assets\/cases\/system\/slice-01\.webp/);
  assert.match(source, /"width": 1720/);
});
```

- [ ] **Step 2: Run the tests and verify the module is missing**

Run: `node --test --test-name-pattern="brand|marketing source|manifest" tests/case-study-pipeline.test.mjs`

Expected: FAIL with `ERR_MODULE_NOT_FOUND` for `scripts/case-study-pipeline.mjs`.

- [ ] **Step 3: Implement the pure slice planner and manifest renderer**

```js
const padSlice = (index) => String(index + 1).padStart(2, "0");

export function buildCaseStudyPlan(
  source,
  { maxWidth = 1720, maxSliceHeight = 4096, quality = 82 } = {},
) {
  const outputWidth = Math.min(source.width, maxWidth);
  const outputHeight = Math.round((source.height * outputWidth) / source.width);
  const sliceCount = Math.ceil(outputHeight / maxSliceHeight);
  const slices = Array.from({ length: sliceCount }, (_, index) => {
    const outputY = index * maxSliceHeight;
    const height = Math.min(maxSliceHeight, outputHeight - outputY);
    const sourceY = Math.round((outputY * source.height) / outputHeight);
    const nextSourceY = Math.round(
      ((outputY + height) * source.height) / outputHeight,
    );

    return {
      index,
      filename: `slice-${padSlice(index)}.webp`,
      src: `/assets/cases/${source.id}/slice-${padSlice(index)}.webp`,
      width: outputWidth,
      height,
      sourceY,
      sourceHeight: nextSourceY - sourceY,
      quality,
    };
  });

  return { ...source, outputWidth, outputHeight, slices };
}

export function renderCaseStudyManifest(plans) {
  const manifest = Object.fromEntries(
    plans.map((plan) => [
      plan.id,
      {
        id: plan.id,
        slices: plan.slices.map(({ src, width, height }) => ({
          src,
          width,
          height,
        })),
      },
    ]),
  );

  return `export const caseStudies = ${JSON.stringify(manifest, null, 2)};\n`;
}
```

- [ ] **Step 4: Run the pipeline unit tests**

Run: `node --test tests/case-study-pipeline.test.mjs`

Expected: 3 tests PASS.

- [ ] **Step 5: Implement the converter CLI**

The CLI must:

1. resolve `--source-root` and default it to the repository root;
2. validate all three input files with their approved dimensions;
3. create `public/assets/cases/<id>/`;
4. invoke `/opt/homebrew/bin/cwebp` for every slice using `-q 82`, `-metadata none`, `-crop 0 <sourceY> <sourceWidth> <sourceHeight>`, `-resize <outputWidth> <sliceHeight>`, and `-o <outputPath>`;
5. abort on a non-zero exit code without overwriting the source PNG;
6. write `src/case-study-manifest.js` with `renderCaseStudyManifest(plans)`.

Add this package script:

```json
"assets:cases": "node scripts/convert-case-studies.mjs --source-root ../.."
```

- [ ] **Step 6: Generate and inspect the WebP output**

Run: `npm run assets:cases`

Expected:

- all slice files exist under the three case directories;
- each slice is at most `1720px` wide and `4096px` high;
- `src/case-study-manifest.js` lists every slice in numeric order;
- the three PNG sources remain byte-for-byte untouched.

Run:

```bash
find public/assets/cases -name '*.webp' -print | sort
sed -n '1,260p' src/case-study-manifest.js
```

- [ ] **Step 7: Commit the pipeline and generated assets**

```bash
git add package.json scripts/case-study-pipeline.mjs scripts/convert-case-studies.mjs tests/case-study-pipeline.test.mjs src/case-study-manifest.js public/assets/cases
git commit -m "feat: optimize case studies into lazy WebP slices"
```

---

### Task 2: Case-Study Modal Behavior

**Files:**
- Create: `src/case-study-model.js`
- Create: `src/CaseStudyModal.jsx`
- Create: `tests/case-study-model.test.mjs`
- Modify: `src/App.jsx`
- Modify: `src/styles.css`
- Modify: `tests/page-shell.test.mjs`

**Interfaces:**
- Consumes: `caseStudies` from `src/case-study-manifest.js`.
- Produces: `getCaseStudy(caseStudies, caseId) -> caseStudy | null`.
- Produces: `shouldDismissCaseStudy({ type, key, isBackdrop }) -> boolean`.
- Produces: `<CaseStudyModal caseId title onClose />`.
- `App` owns `selectedCaseId: string | null` and passes `onOpenCase(project.id)` to cards.

- [ ] **Step 1: Write failing modal-model tests**

```js
import assert from "node:assert/strict";
import test from "node:test";

import {
  getCaseStudy,
  shouldDismissCaseStudy,
} from "../src/case-study-model.js";

const manifest = {
  brand: { id: "brand", slices: [{ src: "/brand-01.webp", width: 1720, height: 4096 }] },
};

test("case lookup returns the requested case and rejects unknown IDs", () => {
  assert.equal(getCaseStudy(manifest, "brand")?.id, "brand");
  assert.equal(getCaseStudy(manifest, "missing"), null);
  assert.equal(getCaseStudy(manifest, null), null);
});

test("modal dismisses only for Escape, backdrop, and explicit close", () => {
  assert.equal(shouldDismissCaseStudy({ type: "keydown", key: "Escape" }), true);
  assert.equal(shouldDismissCaseStudy({ type: "backdrop", isBackdrop: true }), true);
  assert.equal(shouldDismissCaseStudy({ type: "close" }), true);
  assert.equal(shouldDismissCaseStudy({ type: "backdrop", isBackdrop: false }), false);
  assert.equal(shouldDismissCaseStudy({ type: "keydown", key: "Enter" }), false);
});
```

- [ ] **Step 2: Run the model test and verify it fails**

Run: `node --test tests/case-study-model.test.mjs`

Expected: FAIL with `ERR_MODULE_NOT_FOUND` for `src/case-study-model.js`.

- [ ] **Step 3: Implement lookup and dismissal rules**

```js
export function getCaseStudy(manifest, caseId) {
  if (!caseId || !manifest[caseId]) return null;
  return manifest[caseId];
}

export function shouldDismissCaseStudy({ type, key, isBackdrop = false }) {
  if (type === "close") return true;
  if (type === "keydown") return key === "Escape";
  return type === "backdrop" && isBackdrop;
}
```

- [ ] **Step 4: Run the model tests**

Run: `node --test tests/case-study-model.test.mjs`

Expected: 2 tests PASS.

- [ ] **Step 5: Write the failing page-shell modal contract test**

Append a test that reads `App.jsx`, `CaseStudyModal.jsx`, and `styles.css` and asserts:

```js
assert.match(app, /selectedCaseId/);
assert.match(app, /<CaseStudyModal/);
assert.match(modal, /loading="lazy"/);
assert.match(modal, /aria-modal="true"/);
assert.match(modal, /case-study__retry/);
assert.match(css, /\.case-study__document\s*\{[\s\S]*?width:\s*860px/);
assert.match(
  css,
  /@media \(max-width: 760px\)[\s\S]*?\.case-study__document\s*\{[\s\S]*?width:\s*calc\(100vw - 24px\)/,
);
```

- [ ] **Step 6: Run the page-shell modal contract and verify it fails**

Run: `node --test --test-name-pattern="case-study modal" tests/page-shell.test.mjs`

Expected: FAIL because `CaseStudyModal.jsx` and the modal CSS do not exist.

- [ ] **Step 7: Implement `CaseStudyModal`**

The component must:

- return `null` when `getCaseStudy(caseStudies, caseId)` is `null`;
- render a `role="dialog"` / `aria-modal="true"` overlay;
- autofocus the close button;
- attach a document `keydown` handler and close on `Escape`;
- save `document.activeElement` and the body’s inline overflow value on open;
- set `document.body.style.overflow = "hidden"` while open;
- restore overflow and focus on cleanup;
- close only when `event.target === event.currentTarget` for backdrop clicks;
- render the first image eagerly and remaining images with `loading="lazy"`;
- reserve space with inline `aspectRatio: \`${slice.width} / ${slice.height}\``;
- track per-slice load/error state;
- show a compact spinner until slice 1 loads;
- replace a failed slice with a retry button that increments a cache-busting query string for only that slice.

- [ ] **Step 8: Wire modal state into `App.jsx`**

Add:

```js
const [selectedCaseId, setSelectedCaseId] = useState(null);
const selectedProject = projects.find((project) => project.id === selectedCaseId);
```

Pass `onOpenCase={setSelectedCaseId}` to each project card and render:

```jsx
<CaseStudyModal
  caseId={selectedCaseId}
  title={selectedProject?.title ?? ""}
  onClose={() => setSelectedCaseId(null)}
/>
```

- [ ] **Step 9: Add modal layout and state CSS**

Implement:

- fixed full-viewport overlay at a z-index above `VisitorMonitor`;
- `overflow-y: auto` on the overlay;
- centered `860px` document with `max-width: calc(100vw - 24px)`;
- seamless block images (`display: block`, no margin, border, radius, or gaps);
- sticky close button positioned inside the viewport, not over hidden page content;
- restrained first-slice loading state and per-slice retry state;
- mobile document width exactly `calc(100vw - 24px)`.

- [ ] **Step 10: Run modal and full tests**

Run: `npm test`

Expected: all tests PASS.

- [ ] **Step 11: Commit modal behavior**

```bash
git add src/App.jsx src/CaseStudyModal.jsx src/case-study-model.js src/styles.css tests/case-study-model.test.mjs tests/page-shell.test.mjs
git commit -m "feat: open project case studies in an accessible modal"
```

---

### Task 3: Responsive DOM-Owned Project Cards

**Files:**
- Create: `src/ProjectCard.jsx`
- Modify: `src/App.jsx`
- Modify: `src/portfolio-data.js`
- Modify: `src/styles.css`
- Modify: `tests/page-shell.test.mjs`
- Modify: `tests/portfolio-model.test.mjs`

**Interfaces:**
- Consumes: project `{ id, className, defaultImage, hoverImage, artworkRatio, title, description }`.
- Produces: `<ProjectCard project onOpenCase />`.
- `onOpenCase(project.id)` opens the matching modal.
- The clickable card root retains `data-track-label={project.title}` so the existing delegated analytics listener records each open.

- [ ] **Step 1: Write failing project data and markup contract tests**

Add to `tests/portfolio-model.test.mjs`:

```js
test("each project maps to a case and exposes a stable artwork ratio", () => {
  assert.deepEqual(
    projects.map(({ id, caseId }) => [id, caseId]),
    [
      ["brand", "brand"],
      ["marketing", "marketing"],
      ["system", "system"],
    ],
  );
  assert.ok(projects.every((project) => /^\d+ \/ \d+$/.test(project.artworkRatio)));
});
```

Add a page-shell test that asserts:

```js
assert.doesNotMatch(card, /href="#contact"/);
assert.match(card, /type="button"/);
assert.match(card, /project-card__artwork/);
assert.match(card, /project-card__panel/);
assert.match(card, /project-card__arrow/);
assert.match(card, /onOpenCase\(project\.caseId\)/);
```

- [ ] **Step 2: Run the project tests and verify they fail**

Run: `node --test tests/portfolio-model.test.mjs tests/page-shell.test.mjs`

Expected: FAIL for missing `caseId`, `artworkRatio`, and `src/ProjectCard.jsx`.

- [ ] **Step 3: Extend project data**

Add:

```js
caseId: "brand",
artworkRatio: "3600 / 1860",
```

for brand, and:

```js
caseId: "marketing",
artworkRatio: "1748 / 1602",
```

```js
caseId: "system",
artworkRatio: "1748 / 1602",
```

for the two half-width projects.

- [ ] **Step 4: Build the DOM-owned project card**

Use a semantic `<button type="button">` root containing:

```jsx
<span
  className="project-card__artwork"
  style={{ "--artwork-ratio": project.artworkRatio }}
>
  <img className="project-card__image project-card__image--default" ... />
  <img className="project-card__image project-card__image--hover" ... />
</span>
<span className="project-card__panel">
  <span className="project-card__copy">
    <strong>{project.title}</strong>
    <span>{project.description}</span>
  </span>
  <span className="project-card__arrow" aria-hidden="true">
    <ArrowUpRight size={24} />
  </span>
</span>
```

The root calls `onOpenCase(project.caseId)` and carries `data-track-label`, ensuring opening a case is counted without a second tracking path.

- [ ] **Step 5: Replace absolute copy positioning with grid CSS**

Implement these layout guarantees:

- root owns one-pixel border, radius, clipping, and background;
- artwork uses `aspect-ratio: var(--artwork-ratio)` and both images fill it with `object-fit: cover`;
- panel is a two-column grid: `minmax(0, 1fr) auto`;
- copy has `min-width: 0`, controlled `max-width`, and stable gaps;
- arrow owns a fixed circular column;
- artwork hover changes only opacity and scale;
- supplied temporary artwork is covered by a sufficiently opaque panel so embedded lower copy does not compete with DOM copy;
- touch/coarse pointers show hover artwork by default;
- mobile stacks artwork over panel and never uses percentage-based `bottom` offsets;
- descriptions remain visible and may wrap naturally without overlap or clipping.

- [ ] **Step 6: Run project tests and build**

Run: `npm test && npm run build`

Expected: all tests PASS and Vite build completes without warnings about invalid button or image markup.

- [ ] **Step 7: Commit the project-card architecture**

```bash
git add src/App.jsx src/ProjectCard.jsx src/portfolio-data.js src/styles.css tests/page-shell.test.mjs tests/portfolio-model.test.mjs
git commit -m "refactor: stabilize selected work card layout"
```

---

### Task 4: Navigation, Spacing, and Zoom-Stable Responsive Rules

**Files:**
- Modify: `src/styles.css`
- Modify: `tests/page-shell.test.mjs`

**Interfaces:**
- Produces shared CSS tokens `--heading-support-gap` and `--heading-support-gap-compact`.
- Produces masked gradient borders through `.top-nav::before` and `.top-nav__talk::before`.
- Does not change component APIs.

- [ ] **Step 1: Write failing CSS contract tests**

Add assertions:

```js
assert.match(css, /--heading-support-gap:/);
assert.match(css, /\.top-nav::before\s*\{[\s\S]*?linear-gradient\(90deg,[\s\S]*?rgba\(255,\s*255,\s*255,\s*1\)[\s\S]*?rgba\(255,\s*255,\s*255,\s*0\)[\s\S]*?rgba\(255,\s*255,\s*255,\s*1\)/);
assert.match(css, /mask-composite:\s*exclude/);
assert.doesNotMatch(css, /\.project-card__copy\s*\{[\s\S]*?bottom:\s*\d+%/);
```

- [ ] **Step 2: Run the CSS contract and verify it fails**

Run: `node --test --test-name-pattern="gradient|spacing|zoom" tests/page-shell.test.mjs`

Expected: FAIL because the gradient pseudo-element and shared spacing tokens are absent.

- [ ] **Step 3: Implement the one-pixel gradient borders**

For `.top-nav` and `.top-nav__talk`:

- remove the solid border;
- add `position: relative` and isolate stacking;
- use `::before` with `padding: 1px`, inherited radius, pointer-events disabled;
- apply the `100% → 0% → 100%` white opacity gradient;
- use `mask: linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0)` with `mask-composite: exclude`;
- use reduced opacity for the inner Let’s Talk pill.

- [ ] **Step 4: Reduce title-to-support spacing by exactly 30%**

Replace current margins with shared variables calculated from existing values:

- Hero `36px → 25.2px`;
- Approach `42px → 29.4px`;
- Selected Work `28px → 19.6px`;
- Experience identity-to-summary `18px → 12.6px`;
- Contact title-to-details `48px → 33.6px`.

Define desktop and mobile values in `:root` / the mobile media query and use them at the five approved groups.

- [ ] **Step 5: Add explicit tablet and zoom-stable constraints**

Use:

- `min-width: 0` on every grid child that contains text;
- `overflow-wrap: break-word` on long Chinese/English descriptions;
- no viewport percentage offsets for card copy;
- `max-width: 100%` on images and modal content;
- a tablet breakpoint from `761px` to `1023px` that preserves two-column cards only when text and arrow fit;
- `clamp()` for padding and type, avoiding layout values tied to browser pixel zoom;
- `body` and `.content-layer` with no horizontal overflow.

- [ ] **Step 6: Run tests and build**

Run: `npm test && npm run build && git diff --check`

Expected: all tests PASS, build succeeds, and diff check emits no output.

- [ ] **Step 7: Commit visual-system refinements**

```bash
git add src/styles.css tests/page-shell.test.mjs
git commit -m "style: refine navigation and responsive spacing"
```

---

### Task 5: Editorial Experience Layout and Contact Rhythm

**Files:**
- Create: `src/ExperienceSection.jsx`
- Modify: `src/App.jsx`
- Modify: `src/styles.css`
- Modify: `tests/page-shell.test.mjs`

**Interfaces:**
- Consumes: `experience` array from `src/portfolio-data.js`.
- Produces: `<ExperienceSection items={experience} />`.
- Does not alter the Experience section ID or tracking attributes.

- [ ] **Step 1: Write the failing Experience structure test**

Read `ExperienceSection.jsx` and assert:

```js
assert.match(experienceSection, /className="experience__intro"/);
assert.match(experienceSection, /className="experience-list"/);
assert.match(experienceSection, /className="experience-row"/);
assert.match(experienceSection, /ACROSS BRAND,/);
assert.match(experienceSection, /PRODUCT AND MARKET/);
assert.match(experienceSection, /data-track-label="EXPERIENCE"/);
```

Read CSS and assert the old fixed minimum height is absent:

```js
assert.doesNotMatch(css, /\.experience\s*\{[\s\S]*?min-height:\s*1100px/);
```

- [ ] **Step 2: Run the Experience contract and verify it fails**

Run: `node --test --test-name-pattern="Experience" tests/page-shell.test.mjs`

Expected: FAIL because `ExperienceSection.jsx` does not exist and old fixed height remains.

- [ ] **Step 3: Extract the Experience section**

Move the existing section markup into `ExperienceSection.jsx`, retaining:

- `id="experience"`;
- `data-track-section`;
- `data-track-label="EXPERIENCE"`;
- the supplied two-line title;
- identity line and summary;
- five three-column career rows.

Replace the inline section in `App.jsx` with `<ExperienceSection items={experience} />`.

- [ ] **Step 4: Rebuild the desktop editorial grid**

Implement the approved reference:

- section label at the shared shell’s top-left;
- intro block in the left region below the label;
- career list offset into the lower-right region;
- three columns `company / role / period`;
- restrained separators and lower-contrast role/period text;
- content-driven height with no `min-height: 1100px`;
- consistent left/right grid alignment.

- [ ] **Step 5: Collapse cleanly on tablet and mobile**

At `<= 900px`, render intro first and career list second. At `<= 760px`, each career row becomes a vertical stack with company, role, and period, preserving separators and readable gaps.

- [ ] **Step 6: Reduce Experience-to-Contact space by 50%**

Halve the current Experience bottom padding:

- desktop `150px → 75px`;
- mobile `150px → 75px`.

Keep the final career row fully visible and leave Contact as a distinct full-width section.

- [ ] **Step 7: Run tests and build**

Run: `npm test && npm run build`

Expected: all tests PASS and build succeeds.

- [ ] **Step 8: Commit Experience refinements**

```bash
git add src/App.jsx src/ExperienceSection.jsx src/styles.css tests/page-shell.test.mjs
git commit -m "style: rebuild experience editorial layout"
```

---

### Task 6: Fixed Public Visitor Label

**Files:**
- Modify: `src/visitor-monitor-model.js`
- Modify: `tests/visitor-monitor.test.mjs`

**Interfaces:**
- `buildVisitorMonitorModel()` returns `current.visitorLabel === "VISITOR"` for every non-empty session.
- Session IDs, visit numbers, timestamps, heatmaps, and interaction records remain unchanged.

- [ ] **Step 1: Change existing expectations to the approved fixed label**

Update both public-mode assertions:

```js
assert.equal(model.current.visitorLabel, "VISITOR");
assert.equal(publicModel.current.visitorLabel, "VISITOR");
```

Add:

```js
test("all stored visitor numbers are normalized to the public VISITOR label", () => {
  const model = buildVisitorMonitorModel({
    mode: "open",
    snapshot: {
      ...snapshot,
      sessions: [
        { ...snapshot.sessions[0], visitorLabel: "VISITOR 27" },
      ],
    },
    isOwner: false,
  });

  assert.equal(model.current.visitorLabel, "VISITOR");
  assert.equal(model.current.visitNumber, 2);
});
```

- [ ] **Step 2: Run the visitor monitor test and verify it fails**

Run: `node --test tests/visitor-monitor.test.mjs`

Expected: FAIL because the current model exposes the stored `VISITOR 01` label.

- [ ] **Step 3: Normalize only the presentation model**

After selecting the current session, return:

```js
current:
  current.id === "empty"
    ? current
    : { ...current, visitorLabel: "VISITOR" },
```

Do not rewrite local storage or change visit numbering.

- [ ] **Step 4: Run analytics tests**

Run: `node --test tests/visitor-monitor.test.mjs tests/visitor-analytics.test.mjs tests/visitor-store.test.mjs`

Expected: all tests PASS, including click aggregation.

- [ ] **Step 5: Commit the naming change**

```bash
git add src/visitor-monitor-model.js tests/visitor-monitor.test.mjs
git commit -m "fix: simplify live signal visitor naming"
```

---

### Task 7: Integrated Browser Verification and Final Cleanup

**Files:**
- Create: `docs/superpowers/verification/2026-07-26-portfolio-detail-refinement.md`

**Interfaces:**
- Consumes the completed page at the local Vite URL.
- Produces a verification record with viewport, zoom, interaction, and resource results.

- [ ] **Step 1: Start the local server**

Run: `npm run dev -- --host 127.0.0.1 --port 4174`

Expected: Vite reports `http://127.0.0.1:4174/`.

- [ ] **Step 2: Verify desktop visual behavior at 1440 × 1000**

Check and record:

- gradient nav border reads white → transparent → white;
- every heading/support pair uses the reduced spacing;
- each project independently swaps artwork on hover;
- panel text and arrow remain stable;
- each card opens its matching case;
- modal document computes to `860px`;
- first slice loads before later slices;
- no visible seams between slices;
- close button, backdrop, and Escape all close;
- the prior scroll position and focused card are restored;
- Live Signal records one click per open under the project title.

- [ ] **Step 3: Verify tablet and mobile**

At `820 × 1180`, `390 × 844`, and `320 × 568`, check:

- no horizontal page scroll;
- no title, description, or arrow overlap;
- mobile cards show hover artwork by default;
- modal width computes to viewport width minus `24px`;
- long case scrolling remains continuous;
- Experience intro precedes the stacked career list;
- VisitorMonitor remains usable and does not obscure the modal close control.

- [ ] **Step 4: Verify browser zoom**

At desktop width, test `80%`, `100%`, `125%`, and `150%`:

- card copy never uses raster-relative offsets;
- descriptions are not clipped;
- arrows remain in their grid column;
- body does not gain horizontal scrolling;
- modal never exceeds the viewport.

- [ ] **Step 5: Verify resources and console**

Confirm:

- no console errors;
- no failed WebP requests;
- subsequent slices are requested lazily rather than all at initial page load;
- source PNGs are not requested by the browser;
- copy buttons still show “已复制微信号” and “已复制邮箱”.

- [ ] **Step 6: Record evidence**

Create the verification document with:

- tested URL and commit;
- exact viewport/zoom matrix;
- pass/fail for each approved requirement;
- measured desktop and mobile modal widths;
- representative screenshots’ filesystem paths;
- any intentional temporary-artwork limitation while awaiting final frameless artwork.

If any check fails, stop this task, return to the task that owns the failed
requirement, add a reproducing test, apply the focused fix, and rerun that
task’s test gate before resuming this verification matrix.

- [ ] **Step 7: Run the final automated gate**

Run:

```bash
npm test
npm run build
git diff --check
git status --short
```

Expected:

- all tests PASS;
- production build succeeds;
- diff check emits no output;
- status contains only the verification document and any evidence-driven fixes.

- [ ] **Step 8: Commit verified final state**

```bash
git add docs/superpowers/verification/2026-07-26-portfolio-detail-refinement.md
git commit -m "test: verify portfolio detail refinements"
```

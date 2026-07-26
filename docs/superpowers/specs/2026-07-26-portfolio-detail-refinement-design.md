# Portfolio Detail Refinement Design

**Date:** 2026-07-26
**Status:** Approved by user
**Scope:** Homepage visual refinement, responsive project cards, case-study modal, Experience layout, and visitor label simplification. No deployment.

## 1. Goals

This iteration refines the completed portfolio framework without changing its core page structure or the existing visitor analytics architecture.

The result must:

- match the supplied desktop and mobile references more closely;
- keep typography and card content aligned at browser zoom and responsive widths;
- open each Selected Work item in an in-page case-study modal;
- load the three very tall case studies efficiently;
- preserve the existing independent card hover behavior and Live Signal click tracking.

## 2. Navigation Border

The top navigation will no longer use a flat solid border.

- Render the outer pill border with a masked pseudo-element.
- Use a horizontal white opacity gradient: `100% → 0% → 100%`.
- Preserve the existing dark translucent fill, blur, radius, dimensions, and navigation layout.
- Apply the same gradient-border logic to the “Let’s Talk” inner pill at lower opacity.
- The gradient border must remain one physical pixel at all supported viewport sizes.

## 3. Heading and Subtitle Spacing

All title-to-subtitle spacing will be reduced by 30% from the current implementation.

Affected groups:

- Hero title → Chinese subtitle;
- Approach title → supporting sentence;
- Selected Work title → supporting sentence;
- Experience identity line → experience summary;
- Contact title → contact information.

Spacing will use shared CSS custom properties where practical so desktop and mobile retain the same proportional relationship.

## 4. Selected Work Card Architecture

### 4.1 Root cause

The current card imagery contains the visual frame while the title and description are separate DOM layers. The image frame scales as raster pixels, while text reflows according to CSS. This produces misalignment at mobile widths and browser zoom.

### 4.2 New composition

Each card will be a DOM-owned responsive component:

- outer border and corner radius rendered in CSS;
- artwork rendered as a background image layer;
- information panel, glass blur, border, title, description, and arrow rendered in DOM/CSS;
- card copy laid out with CSS Grid rather than free absolute positioning;
- text containers use `min-width: 0`, controlled line lengths, and responsive padding;
- arrow occupies its own fixed grid column and cannot overlap text;
- wide and half-width cards keep their supplied source ratios;
- mobile cards switch to a stacked composition with a stable artwork-to-copy relationship.

The existing images remain placeholders during development. Final production assets should contain only artwork and image-native brand/product content—no outer card border, information panel, DOM copy, or arrow.

Required final artwork:

- brand default and hover: `3600 × 1860`;
- marketing default and hover: `1748 × 1602`;
- system default and hover: `1748 × 1602`.

Replacing placeholder artwork must not require CSS changes.

## 5. Selected Work Interaction

### 5.1 Hover

- Desktop: each card independently transitions between default and hover artwork.
- Touch/mobile: show the real-work hover artwork by default, matching the current behavior.
- Hover transitions affect only artwork opacity/scale; DOM copy and frame remain stable.

### 5.2 Click

Clicking a card will no longer navigate to Contact.

- Open a full-viewport dark modal overlay.
- Display the corresponding case study as a vertically scrollable, visually continuous long image.
- Desktop content width: exactly `860px`, centered.
- Mobile content width: `calc(100vw - 24px)`.
- Modal viewport owns scrolling; the page behind it is locked.
- Close with the visible close button, backdrop click, or `Escape`.
- Restore the previous page scroll position and focus on close.
- Opening a case remains a tracked click in Live Signal using the project title.

## 6. Case-Study Image Pipeline

### 6.1 Sources

- `品牌系统-案例.png` — `2656 × 32768`, approximately 31MB;
- `系统架构-案例.png` — `3215 × 32768`, approximately 28MB;
- `营销全案-案例.png` — `1630 × 32768`, approximately 17MB.

The source PNG files must remain untouched.

### 6.2 Processing

Each long image will appear continuous to the visitor but will be stored as multiple WebP slices.

- Maximum output width: `1720px`.
- Do not upscale the 1630px marketing source.
- Slice height: up to `4096px` after resizing.
- Format: lossy WebP.
- Quality target: 82.
- Strip metadata.
- Use deterministic filenames grouped by case and ordered numerically.
- Generate a manifest containing project ID, slice path, width, and height.

### 6.3 Loading

- Load the first slice when the modal opens.
- Lazy-load subsequent slices shortly before they enter the viewport.
- Render slices with no visible gaps, borders, radius, or background seams.
- Reserve each slice’s aspect-ratio space before load to prevent layout shift.
- Show a restrained loading state until the first slice is ready.
- If a slice fails, show a retry control for that slice without closing the modal.

## 7. Browser Zoom and Responsive Stability

The card and typography fixes must work at:

- desktop widths from 1024px upward;
- tablet widths from 761px to 1023px;
- mobile widths from 320px to 760px;
- browser zoom levels of 80%, 100%, 125%, and 150%.

Rules:

- no text positioned by percentage-based bottom offsets;
- no text or arrow overlap;
- no clipped descriptions;
- card titles may wrap only within their text grid column;
- modal never exceeds the viewport width;
- body must not gain horizontal scrolling.

## 8. Experience Section

Rebuild the Experience layout to match the supplied reference:

- section label remains at the top-left of the shared shell;
- large left introduction block below it;
- title uses two lines: “ACROSS BRAND,” and “PRODUCT AND MARKET”;
- identity line and summary sit directly under the title;
- career list begins in the lower-right region;
- list uses three columns: company, role, period;
- subdued separators and lower-contrast secondary text;
- left and right regions align to a consistent editorial grid;
- mobile collapses to introduction followed by the career list.

The section height will be content-driven instead of relying on the current `min-height: 1100px`.

## 9. Experience-to-Contact Spacing

Reduce the visible space between Experience content and Contact by 50%.

- Remove excess minimum height.
- Reduce Experience bottom padding by half.
- Preserve enough breathing room for the final career row.
- Contact remains a distinct full-width visual section.

## 10. Live Signal Visitor Naming

All anonymized viewers will display as:

`VISITOR`

Do not append an incrementing visitor number.

Sessions remain distinguishable through:

- `VISIT 01`, `VISIT 02`, and so on;
- history row visit numbers;
- session timestamps and interaction data.

No recipient ID or dedicated-link token is exposed.

## 11. Component Boundaries

- `ProjectCard`: stable DOM card composition and hover/click entry point.
- `CaseStudyModal`: overlay, focus/scroll management, close behaviors, and slice rendering.
- `case-study-manifest`: generated metadata for WebP slices.
- `ExperienceSection`: editorial two-region layout.
- `VisitorMonitor`: unchanged data collection, simplified visitor label presentation.

The case conversion script is a build-time/local asset utility and has no runtime dependency.

## 12. Testing and Verification

Automated tests will cover:

- project cards open the correct case ID rather than navigating to Contact;
- modal closes by button, backdrop, and Escape;
- case manifest preserves slice order and dimensions;
- visitor labels are always `VISITOR`;
- existing analytics click aggregation remains intact.

Browser verification will cover:

- desktop card alignment and hover;
- mobile card alignment;
- browser zoom at 80%, 100%, 125%, and 150%;
- 860px desktop modal width;
- mobile modal width and long-scroll continuity;
- background scroll lock and restoration;
- Experience layout against the supplied reference;
- no console errors or failed case-study resources.

`npm test`, `npm run build`, and `git diff --check` must pass. The local preview remains available; no Netlify or Sites deployment is performed.

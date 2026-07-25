# Design QA

## Comparison Target

- Source visual truth:
  - `/Users/jade/Desktop/Portflio Test 1.5.jpg` — 4320 × 14312 px, opened and inspected before the source file was reorganized.
  - `/Users/jade/Desktop/SELECTED WORK.png` — 2507 × 2511 px, opened and inspected before the source file was reorganized.
  - `/Users/jade/Desktop/Longkid Folder/面试准备/面试Coding/ninebot-portfolio-home/storyboards/hero-interaction-storyboard-chaos-to-order-v1.png` — 1642 × 958 px.
- Local implementation: `http://localhost:4173/`
- Desktop viewport: 1440 × 900 CSS px, device scale factor 1.
- Mobile viewport: 390 × 844 CSS px, device scale factor 1.
- Final desktop document height: 4947 CSS px. The 4320 px-wide reference scales to approximately 4771 px at 1440 px width.

## Evidence

- Desktop Hero: `artifacts/desktop-hero-v2.png`
- Cover scroll: `artifacts/desktop-cover-scroll.png`
- Desktop Selected Work: `artifacts/desktop-work-v2.png`
- Desktop Experience: `artifacts/desktop-experience-v2.png`
- Desktop Contact: `artifacts/desktop-contact-v2.png`
- Mobile Hero: `artifacts/mobile-hero.png`
- Mobile Selected Work: `artifacts/mobile-work-v2.png`

The fixed Hero causes the in-app browser's full-page screenshot mode to repeat the fixed layer, so full-page raster output was not used as fidelity evidence. Section screenshots at the exact viewport and browser-measured section heights were used instead.

## Required Fidelity Surfaces

### Fonts and typography

- The implementation uses Helvetica Neue with PingFang SC and system fallbacks, matching the thin grotesk appearance in the reference.
- Display headings use light optical weights, tight letter spacing, and the same uppercase hierarchy.
- Chinese body text remains readable at desktop and wraps without overflow on mobile.

### Spacing and layout rhythm

- Desktop content width is 78vw with an 1180 px cap, matching the reference's narrow central column.
- Final section heights are: Hero 900, Approach 950, Selected Work 1278, Experience 1100, Contact 720 CSS px.
- The first content panel begins after one viewport and rises over the fixed Hero.
- The one-wide/two-small card grid remains intact on desktop and becomes one column on mobile.

### Colors and visual tokens

- Background is true black with low-opacity grey copy, fine dividers, and cyan imagery.
- Navigation and buttons use restrained translucent borders and no unrelated accent colors.
- Contact and Hero imagery retain their supplied black/cyan palette.

### Image quality and asset fidelity

- All supplied images are used directly; no generated or CSS-drawn substitutes are present.
- The 3600 × 1860 main card and 1748 × 1602 small cards keep their supplied aspect ratios.
- Hover states crossfade between independent image layers.
- The supplied 1280 × 720 Hero video is treated as a replaceable placeholder; the 4320 × 2520 poster supplies the stable final frame.

### Copy and content

- The Hero, Approach, Selected Work, Experience, and Contact copy follows the reference.
- Navigation anchors, email, phone link, CTA, and project links are functional.

### Accessibility and responsiveness

- Semantic sections, links, labels, focus-visible outlines, reduced-motion handling, muted inline video, and poster fallback are implemented.
- At 390 × 844, the layout has no horizontal overflow.
- Mobile uses the real project imagery directly rather than requiring hover.

## Comparison History

### Iteration 1

- [P1] Hero video ended on the chaos frame instead of the supplied person poster.
  - Fix: added a settled-state video fade so the final high-resolution poster is revealed.
  - Post-fix evidence: `artifacts/desktop-hero-v2.png`.
- [P2] A narrow browser viewport still showed the default project images because viewport resizing does not emulate a coarse pointer.
  - Fix: added an explicit max-width 760 px rule that reveals each real project image.
  - Post-fix evidence: `artifacts/mobile-work-v2.png`.
- [P2] Initial desktop document height was 6537 px, materially looser than the reference's scaled 4771 px.
  - Fix: reduced section minimum heights, padding, list rows, card width, and vertical gaps.
  - Post-fix evidence: final measured height 4947 px and the final section screenshots.

### Iteration 2

- No remaining actionable P0, P1, or P2 visual differences were found.
- Browser console errors and warnings: none.
- Tested: video playback/fallback, cover scroll, navigation destinations, desktop card layers, mobile real-image state, mobile layout, email and phone link presence.

## Follow-up Polish

- [P3] Replace the current 1280 × 720 Hero video with the final higher-resolution export when available. The asset path can remain `/assets/hero-bg.mp4`.
- [P3] Replace any project placeholder with the final export at the same current filename to avoid code changes.

final result: passed

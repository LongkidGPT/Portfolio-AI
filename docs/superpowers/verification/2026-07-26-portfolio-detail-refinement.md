# Portfolio Detail Refinement — Integrated Browser Verification

## Result

BLOCKED. Desktop, tablet, mobile, interaction, modal, analytics, resource, and
console requirements passed. The complete real Chrome browser-zoom matrix did
not: 80%, 100%, and 125% page/card checks completed, but their focused modal
measurements did not; 150% was interrupted when the user moved Chrome's
foreground state to another tab. No viewport-equivalent result is counted as
real browser-zoom evidence.

- Responsive/browser-interaction URL: `http://127.0.0.1:4174/?owner=1&visitor=task7`
- Real Chrome zoom URL: `http://127.0.0.1:4174/?owner=1&visitor=chrome-real-zoom`
- Tested commit: `ca442409fa9765723f94f500ab2ac4e185c9dbd3`
- Browser drivers: `npx --yes agent-browser`; user Chrome through the Chrome
  extension and Computer Use for browser-level zoom
- Verification date: 2026-07-26

## Responsive viewport matrix

| Mode | Browser CSS viewport | Result | Evidence |
| --- | ---: | --- | --- |
| Desktop | 1440 × 1000 | PASS | No horizontal overflow; all three cards and the 860px modal stayed in bounds. |
| Tablet | 820 × 1180 | PASS | No horizontal overflow; two-column cards remained readable; modal measured 796px; long-case middle and bottom were inspected. |
| Mobile | 390 × 844 | PASS | Stacked cards, default hover artwork, 366px modal, continuous long-case scroll. |
| Small mobile | 320 × 568 | PASS | Stacked cards, default hover artwork, 296px modal, usable collapsed Live Signal bar; long-case middle and bottom were inspected. |

The earlier 1800 × 1250, 1440 × 1000, 1152 × 800, and 960 × 667 checks
remain useful responsive-reflow stress tests only. They are not browser zoom
and are excluded from the real Chrome matrix below.

## Real Chrome browser zoom matrix

The same Chrome window and local-origin tab were used. Zoom was applied at the
browser level, not through CSS transforms or viewport replacement.

| Chrome zoom | Live browser metrics | Page/card result | Modal result | Evidence | Status |
| ---: | --- | --- | --- | --- | --- |
| 80% | `inner=1715×860`, `devicePixelRatio=1.6`, no document overflow; card widths `944/457/457px`; copy-arrow gap `51px`; no copy/arrow clipping | PASS | Not measured in the real-zoom focused run | `chrome-zoom-80-work.jpg` | PARTIAL |
| 100% | `inner=1372×688`, `devicePixelRatio=2`, no document overflow; card widths `856/413/413px`; copy-arrow gap `41px`; no copy/arrow clipping | PASS | Not measured in the real-zoom focused run | `chrome-zoom-100-work.jpg` | PARTIAL |
| 125% | `inner=1097×550`, `devicePixelRatio=2.5`, no document overflow; card widths `685/327/327px`; copy-arrow gap `33px`; no copy/arrow clipping | PASS | Not measured in the real-zoom focused run | `chrome-zoom-125-work.jpg` | PARTIAL |
| 150% | The user changed Chrome's foreground state to YouTube while the claimed portfolio tab remained in the background. OS-level zoom shortcuts could not be sent safely to the background tab. | Not measured | Not measured | No valid screenshot | BLOCKED |

The stopping condition is tooling/foreground ownership, not a discovered page
layout failure. Retest 150% and modal containment at all four real zoom levels
after the portfolio tab can remain foreground-controlled.

## Approved-requirement results

| Requirement | Result | Browser evidence |
| --- | --- | --- |
| Navigation border | PASS | `.top-nav::before` computed to `linear-gradient(90deg, white 0%, transparent 50%, white 100%)`, opacity `0.26`. |
| Reduced heading/support spacing | PASS | Measured desktop gaps: Hero `25.19px`, Approach `29.39px`, Selected Work `19.59px`, Experience identity/summary `12.59px`, Contact `33.59px`. The automated exact-30%-reduction contract also passed. |
| Independent project hover artwork | PASS | Each card independently transitioned from default/hover opacity `1/0` to `0/1`; panel and arrow bounding boxes stayed unchanged. |
| Card text and arrow stability | PARTIAL | All responsive viewports passed. Real Chrome 80%, 100%, and 125% also had no document overflow or copy/arrow clipping, with minimum measured gaps of `51px`, `41px`, and `33px`; 150% remains blocked. Computed copy position in the responsive runs was `static` with `bottom: auto`. |
| Project-to-case mapping | PASS | Brand opened `品牌系统｜视觉语言定义` with six `/assets/cases/brand/` slices; Marketing opened `营销全案｜新品上市视觉` with eight `/assets/cases/marketing/` slices; System opened `系统架构｜品牌包装规范` with five `/assets/cases/system/` slices. |
| Desktop modal width | PASS | Document measured exactly `860px`. |
| Tablet/mobile modal width | PASS | Measured `796px` at 820, `366px` at 390, and `296px` at 320: viewport width minus `24px` in every case. |
| Real-zoom modal containment | BLOCKED | The real Chrome focused run did not open and measure the modal at 80%, 100%, 125%, or 150%. Responsive/modal measurements are not substituted for this requirement. |
| Lazy case resources | PASS | At desktop and 820px modal top, only brand slices 01–02 were requested. At 390px and 320px, the shorter slice height put 01–03 inside Chrome's initial lazy-load horizon. At 820px, scrolling to `5200px` requested 03–05 while 06 remained unloaded until the bottom. At 320px, 04–06 were not requested until scrolling to `1800px`. First-slice resource start preceded later batches in every run. |
| Continuous case scrolling | PASS | All five adjacent brand-slice gaps measured `0px` at the top, middle, and bottom. At 820px, the 03→04 boundary appeared at viewport `y=510.73px` and the modal reached `scrollTop=max=8688px`; at 320px, the same boundary appeared at `y=326.67px` and the modal reached `scrollTop=max=3108px`. All six images had non-zero natural width by each bottom. No seam appeared in the middle/bottom screenshots. |
| Modal close behavior | PASS | Close button, backdrop pointer click, and Escape each dismissed the dialog. Body overflow locked while open and restored afterward. Page scroll restored to its prior value and focus returned to the invoking project card. Sticky close remained fully visible at the bottom of the long case. |
| Modal focus isolation | PASS | The page background becomes `inert` and `aria-hidden` while the dialog is open; Tab and Shift+Tab wrap inside the dialog; cleanup restores the prior attributes, body overflow, and invoking-card focus. |
| Case-study accessibility | PASS | The dialog has one programmatic title; continuous visual slices use empty alt text and stay hidden from assistive technology instead of announcing repetitive page numbers. |
| Mobile project behavior | PASS | Document scroll width equaled client width at 390 and 320. Artwork preceded the DOM panel; default/hover opacities computed to `0/1`; titles, descriptions, and arrows did not overlap. |
| Experience ordering | PASS | At 820, 390, and 320, the intro rectangle preceded the career-list rectangle; mobile career rows were stacked at full list width. |
| VisitorMonitor usability | PASS | The mobile bar stayed fully inside the viewport and could be collapsed to a 44px-high bar before card interaction. At 820, 390, and 320, its rectangle did not intersect the modal close rectangle; the modal also remained above it in stacking order. |
| Live Signal aggregation | PASS | Three real opens of the Brand card rendered `品牌系统｜视觉语言定义 ×3`; each open contributed exactly one title-labelled click. Current and history rows render `VISITOR` while preserving their internal session identities. |
| Copy feedback | PASS | Real clicks produced `已复制微信号` and `已复制邮箱` before the 1.8-second feedback reset. |
| Media delivery | PASS | Homepage artwork, poster, and contact imagery use optimized WebP assets; Hero uses the optimized MP4 with `preload="metadata"`. Relevant delivery weight fell from 29.64 MiB to 3.77 MiB while original source assets remain available under `source-assets/homepage`. Moving those originals outside `public` reduced `dist/client` from 45,544 KiB to 9,132 KiB. Browser verification confirmed desktop hover-on-demand; the coarse-pointer single-image policy is covered by the artwork-policy regression test because the attempted 390 browser preset remained fine-pointer. |
| Resources | PASS | All observed case WebP requests returned HTTP 200. No case-study PNG was requested by the browser. |
| Console/page errors | PASS | Focused desktop verification returned no page or console errors. A discovered implicit `favicon.ico` 404 was fixed by declaring the existing WebP poster as the favicon; its local resource returns HTTP 200 and the regression test prevents an undeclared favicon. |

## Representative screenshots

- `/Users/jade/Desktop/Longkid Folder/AIGC/Portflio Test 1.5/.worktrees/portfolio-home/.superpowers/sdd/2026-07-26-portfolio-detail-refinement/evidence/desktop-brand-modal-top.png`
- `/Users/jade/Desktop/Longkid Folder/AIGC/Portflio Test 1.5/.worktrees/portfolio-home/.superpowers/sdd/2026-07-26-portfolio-detail-refinement/evidence/desktop-brand-modal-mid.png`
- `/Users/jade/Desktop/Longkid Folder/AIGC/Portflio Test 1.5/.worktrees/portfolio-home/.superpowers/sdd/2026-07-26-portfolio-detail-refinement/evidence/desktop-live-signal.png`
- `/Users/jade/Desktop/Longkid Folder/AIGC/Portflio Test 1.5/.worktrees/portfolio-home/.superpowers/sdd/2026-07-26-portfolio-detail-refinement/evidence/tablet-820-work.png`
- `/Users/jade/Desktop/Longkid Folder/AIGC/Portflio Test 1.5/.worktrees/portfolio-home/.superpowers/sdd/2026-07-26-portfolio-detail-refinement/evidence/tablet-820-brand-modal-mid-fix1.png`
- `/Users/jade/Desktop/Longkid Folder/AIGC/Portflio Test 1.5/.worktrees/portfolio-home/.superpowers/sdd/2026-07-26-portfolio-detail-refinement/evidence/tablet-820-brand-modal-bottom-fix1.png`
- `/Users/jade/Desktop/Longkid Folder/AIGC/Portflio Test 1.5/.worktrees/portfolio-home/.superpowers/sdd/2026-07-26-portfolio-detail-refinement/evidence/mobile-390-brand-modal-mid.png`
- `/Users/jade/Desktop/Longkid Folder/AIGC/Portflio Test 1.5/.worktrees/portfolio-home/.superpowers/sdd/2026-07-26-portfolio-detail-refinement/evidence/mobile-320-work.png`
- `/Users/jade/Desktop/Longkid Folder/AIGC/Portflio Test 1.5/.worktrees/portfolio-home/.superpowers/sdd/2026-07-26-portfolio-detail-refinement/evidence/mobile-320-brand-modal.png`
- `/Users/jade/Desktop/Longkid Folder/AIGC/Portflio Test 1.5/.worktrees/portfolio-home/.superpowers/sdd/2026-07-26-portfolio-detail-refinement/evidence/mobile-320-brand-modal-mid-fix1.png`
- `/Users/jade/Desktop/Longkid Folder/AIGC/Portflio Test 1.5/.worktrees/portfolio-home/.superpowers/sdd/2026-07-26-portfolio-detail-refinement/evidence/mobile-320-brand-modal-bottom-fix1.png`
- `/Users/jade/Desktop/Longkid Folder/AIGC/Portflio Test 1.5/.worktrees/portfolio-home/.superpowers/sdd/2026-07-26-portfolio-detail-refinement/evidence/chrome-zoom-80-work.jpg`
- `/Users/jade/Desktop/Longkid Folder/AIGC/Portflio Test 1.5/.worktrees/portfolio-home/.superpowers/sdd/2026-07-26-portfolio-detail-refinement/evidence/chrome-zoom-100-work.jpg`
- `/Users/jade/Desktop/Longkid Folder/AIGC/Portflio Test 1.5/.worktrees/portfolio-home/.superpowers/sdd/2026-07-26-portfolio-detail-refinement/evidence/chrome-zoom-125-work.jpg`
- `/Users/jade/Desktop/Longkid Folder/AIGC/Portflio Test 1.5/.worktrees/portfolio-home/.superpowers/sdd/2026-07-26-portfolio-detail-refinement/evidence/final-fix-desktop-1440-home.png`
- `/Users/jade/Desktop/Longkid Folder/AIGC/Portflio Test 1.5/.worktrees/portfolio-home/.superpowers/sdd/2026-07-26-portfolio-detail-refinement/evidence/final-fix-mobile-390-layout-only.png`

## Automated final gate

- `npm test`: PASS, 69 tests, 0 failures, including real React DOM modal/card interaction coverage.
- `npm run build`: PASS, Vite transformed 4,583 modules and prepared the Sites build.
- `git diff --check 63c1625..HEAD`: PASS after the final documentation cleanup, no output.
- `git status --short`: clean after the final verification commit.

## Intentional temporary-artwork limitation

The supplied project-card PNGs still contain baked lower information panels. Each project therefore keeps `temporaryArtworkRatio`; the opaque DOM panel covers that temporary content on desktop, while mobile crops from the top before placing the independent DOM panel below. When final frameless artwork arrives, keep `artworkRatio` and remove `temporaryArtworkRatio`; no CSS redesign is required.

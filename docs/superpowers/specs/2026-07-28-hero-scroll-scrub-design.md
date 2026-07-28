# Hero Scroll-Scrub Interaction Design

**Date:** 2026-07-28

**Status:** Approved direction — Scheme A

**Scope:** Hero interaction replacement and Contact background asset replacement

## 1. Goal

Replace the automatic Hero playback with a short, controlled opening sequence:

1. The page opens on the first frame of `hero-bg test 01`.
2. Downward page-scroll input advances the video frame by frame while the Hero stays fixed.
3. Pointer movement in any direction creates subtle two-dimensional parallax without changing video progress.
4. When the video completes, `hero-poster 02` fades in and locks as the final visual.
5. Title, subtitle, and the two capsule actions appear in sequence.
6. Only after that reveal is complete does the next downward scroll release the page and allow the second section to cover the Hero.

The interaction must feel cinematic and controlled without allowing the user to skip the final composition.

## 2. Source Assets

- Hero motion master: `/Users/jade/Desktop/Longkid Folder/AIGC/Portflio Test 1.5/hero-bg test 01.mp4`
  - 3840 × 2160 px
  - 8 seconds
  - 24 fps
  - H.264 with an audio stream
- Final Hero visual: `/Users/jade/Desktop/Longkid Folder/AIGC/Portflio Test 1.5/hero-poster 02.png`
  - 4320 × 2430 px
- Pointer light source: `/Users/jade/Desktop/Longkid Folder/AIGC/Portflio Test 1.5/light spot.png`
  - 965 × 965 px
  - transparent PNG
- Contact background: `/Users/jade/Desktop/Longkid Folder/AIGC/Portflio Test 1.5/contact-bg 02.png`
  - 2880 × 1500 px
  - transparent PNG

Original masters remain unchanged. Web-delivery derivatives are stored under `public/assets`, while the current source-asset structure retains a copy of the Hero motion master.

## 3. Interaction State Model

The Hero controller uses five explicit states:

1. `ready`
   - First video frame is visible.
   - Video is paused.
   - Hero copy and actions are hidden.
   - Scroll capture is active.
2. `scrubbing`
   - Downward wheel, trackpad, keyboard, or touch input advances the video.
   - Progress is monotonic and cannot rewind.
   - Pointer parallax and the light source remain active on fine-pointer desktop devices.
3. `resolving`
   - Video is frozen on its final usable frame.
   - Final poster and copy sequence run automatically.
   - Additional downward input is temporarily consumed so the reveal cannot be skipped.
4. `revealed`
   - Final poster and all copy/actions are visible.
   - Hero progress is permanently locked for the current page session.
   - The next downward input is allowed to reach the document.
5. `released`
   - Native page scrolling resumes.
   - Approach and later sections cover the fixed Hero using the existing stacking behavior.

Returning to the top during the same page session keeps the final Hero state. Reloading the page resets the interaction to the first frame.

## 4. Scroll-to-Video Mapping

### Desktop

- Only positive vertical scroll input advances the video.
- Horizontal wheel input and pointer movement do not affect video time.
- `WheelEvent.deltaY` is normalized to CSS-pixel distance across pixel, line, and page delta modes.
- The cumulative distance required to complete the 8-second video is:

```text
clamp(2.2 × viewport height, 1200 px, 2200 px)
```

This targets approximately two to three deliberate wheel/trackpad gestures without depending on a literal device-specific event count.

### Mobile

- An upward finger swipe advances the video.
- Touch travel is normalized to CSS pixels and uses the same viewport-relative completion distance.
- Native document movement is prevented only while the Hero is in `ready`, `scrubbing`, or `resolving`.
- Horizontal touch movement does not drive the video.

### Keyboard and accessibility input

- `ArrowDown`, `PageDown`, and `Space` advance the sequence in controlled increments.
- Reduced-motion users bypass scrubbing: the final poster and complete Hero copy appear immediately, and native scrolling remains available.

### Motion smoothing

- Input updates a target progress value.
- `requestAnimationFrame` eases the rendered progress toward the target.
- Video time is derived from rendered progress and clamped between the first frame and the final usable frame.
- The controller prefers `requestVideoFrameCallback` when available to avoid unnecessary seek updates.

The interaction must remain responsive to small scroll input but must not jump several seconds from one unusually large wheel event.

## 5. Two-Dimensional Pointer Parallax

Pointer movement is independent from scroll progress.

- Pointer X and Y are normalized around the viewport center to a `-1…1` range.
- The complete visual stage — active video or final poster — shares one transform wrapper so there is no alignment jump during the final crossfade.
- Maximum desktop movement:
  - horizontal translation: ±18 px
  - vertical translation: ±12 px
  - Y-axis rotation: ±0.7°
  - X-axis rotation: ±0.5°
  - base scale: approximately 1.04
- Movement is eased with a short trailing response rather than attached rigidly to the cursor.
- Leaving the Hero eases the stage back toward center.
- Compact and coarse-pointer devices disable pointer parallax.

This is a controlled planar pseudo-3D effect. It does not claim object-level depth extraction from the flat source video.

## 6. Pointer Light

`light spot.png` supplies the visible light core.

- The asset follows pointer X/Y with a small lag.
- CSS supplies only the surrounding diffusion, opacity, and blend treatment.
- The image uses screen-style blending over the video.
- Pointer velocity may adjust brightness and scale within a narrow range; it must not pulse continuously while stationary.
- The light does not advance or rewind the video.
- The light remains active after the final poster locks, preserving spatial responsiveness.
- Touch/coarse-pointer devices do not display a persistent cursor light.

## 7. Final Poster and Copy Reveal

When video progress reaches 100%, the controller enters `resolving` automatically:

1. Freeze the video at its final usable frame.
2. Crossfade `hero-poster 02` over approximately 1050 ms using a soft ease-out curve.
3. Keep video and poster inside the same crop and parallax transform wrapper.
4. After the poster becomes visually dominant:
   - title fades and rises in over approximately 550 ms;
   - subtitle follows approximately 180 ms later;
   - primary capsule follows approximately 180 ms later;
   - WeChat capsule follows approximately 140 ms after the primary capsule.
5. When the last capsule completes, enter `revealed`.
6. The next downward scroll or swipe releases native page scrolling.

The final fade uses matched `object-fit`, `object-position`, scale, and brightness. It does not fade the video to black before showing the poster, because that would break visual continuity.

## 8. Asset Delivery

### Hero video

- Create an optimized, audio-free MP4 derivative.
- Target 1920 × 1080 for desktop delivery.
- Use H.264, `yuv420p`, fast-start metadata, and a short GOP suitable for interactive seeking.
- Preserve 24 fps.
- Keep the delivery asset at or below 6 MiB while prioritizing smooth seeks over the smallest possible file.
- Extract the real first frame as the loading poster so initial paint matches the scrub start.

### Raster assets

- Convert `hero-poster 02.png` to high-quality WebP.
- Convert `light spot.png` to alpha-preserving WebP only if visual comparison shows no halo degradation; otherwise keep the supplied PNG.
- Convert `contact-bg 02.png` to WebP.
- Retain all source proportions and avoid upscaling.

## 9. Contact Section

- Replace the current Contact background with the optimized derivative of `contact-bg 02.png`.
- Preserve the current section height, crop behavior, copy, contact details, CTA, footer, and visitor-monitor behavior.
- Calibrate `object-position` independently for desktop and mobile only when the new image focal point requires it.

## 10. Loading and Failure Behavior

- The first-frame poster is visible immediately while video metadata loads.
- Scroll input may update target progress while metadata is loading, but the page must not remain trapped indefinitely.
- If video metadata or seek readiness fails within 4 seconds, the controller:
  1. shows the final poster;
  2. reveals the complete Hero copy;
  3. releases native scrolling.
- Reduced-motion mode follows the same final-poster fallback without attempting interactive scrubbing.
- If the pointer-light asset fails, parallax remains functional and the light layer stays hidden.
- If the final poster fails, the video final frame remains visible and the copy still reveals.

## 11. Component Boundaries

- `hero-controller.js`
  - Input normalization
  - Scroll/touch progress mapping
  - State transitions
  - Release gate
- Hero React integration
  - Event subscription and cleanup
  - Video seeking
  - Reveal-state rendering
- Pointer-parallax helper
  - X/Y normalization
  - Smoothed transform values
  - Pointer-light position and velocity response
- Asset preparation
  - Video optimization
  - First-frame extraction
  - WebP conversion
- Existing page layers
  - Hero remains fixed
  - Content layer continues to cover the Hero after release

Each unit communicates through progress, state, and normalized pointer values rather than directly manipulating unrelated page sections.

## 12. Verification

### Automated tests

- Scroll progress is monotonic and clamps at 100%.
- Negative scroll does not rewind the sequence.
- Wheel delta modes normalize consistently.
- Touch travel maps to the same progress model.
- Video completion triggers `resolving`, then `revealed`.
- Scroll remains captured during reveal and releases only on the next downward input after reveal.
- Reduced-motion and media-failure paths never trap page scrolling.
- Pointer normalization and parallax limits remain bounded.
- Compact/coarse-pointer devices do not activate the desktop pointer layer.
- Updated assets exist and remain inside delivery budgets.

### Browser verification

- Desktop mouse wheel and trackpad behavior.
- Desktop two-dimensional pointer movement and light response.
- Two to three deliberate gestures complete the video at representative viewport heights.
- Final poster crossfade has no crop, brightness, or transform jump.
- Title, subtitle, and capsules appear in the approved order.
- The next scroll releases Approach over the fixed Hero.
- Mobile upward swipes advance the video and release correctly.
- Reduced-motion mode shows the final state immediately.
- Contact background crop works at desktop and mobile widths.
- No console errors, horizontal overflow, or persistent body-scroll lock.

## 13. Acceptance Criteria

- The video never autoplays on page load.
- Vertical scroll/swipe is the only input that advances the video.
- Pointer movement in any direction affects parallax but not progress.
- The Hero completes in approximately two to three deliberate scroll/swipe gestures.
- The final poster locks and does not rewind during the page session.
- Copy and capsules reveal only after the final visual appears.
- The page releases only after the reveal completes, and the next downward input moves into the second section.
- The new pointer-light and Contact assets are visible and correctly cropped.
- Desktop, mobile, reduced-motion, and failure fallbacks remain usable.

# Cycle Spatial View and Page Polish Design

## Objective

Replace the flat final-poster parallax with a pointer-controlled spatial-view illusion based on `cycle.mp4`, while preserving the existing scroll-driven Hero intro. Complete the related Contact, copy-feedback, pointer-light, and Experience color refinements requested in the same review round.

## Confirmed interaction sequence

1. The page opens on the first frame of the existing Hero intro video.
2. Vertical wheel input on desktop, or vertical swipe input on mobile, advances the intro video.
3. When the intro resolves, the Hero title, subtitle, and capsule actions appear in the existing staged sequence.
4. The settled Hero scene uses `cycle.mp4` as an interactive view source instead of applying a planar transform to `hero-poster 02`.
5. The page releases to normal scrolling using the existing Hero state machine.

The interactive `cycle.mp4` view is active only after the settled Hero scene is revealed. It does not replace the scroll-controlled intro video.

## Cycle video mapping

### Source characteristics

- File: `cycle.mp4`
- Duration: approximately 8.096 seconds
- Resolution: 1280 × 720
- The frontal view is located at the loop seam: the beginning and end of the video.
- The complete file contains a 360-degree rotation, but the website must never expose that full rotation.

### Allowed viewing range

Only the frontal `-15°` to `+15°` range is used.

Assuming a near-uniform 360-degree rotation:

- `15° / 360° × 8.096s ≈ 0.337s`
- One side is sampled from the final approximately 0.34 seconds.
- The frontal position is sampled at the loop seam.
- The opposite side is sampled from the first approximately 0.34 seconds.

The exact endpoints may be visually tuned within this window if the generated video's angular velocity is not perfectly uniform.

### Desktop control

- The cursor's horizontal position inside the Hero determines the target viewing angle.
- Cursor at center: frontal frame.
- Cursor moves left: select the corresponding camera view from the right side.
- Cursor moves right: select the corresponding camera view from the left side.
- The mapping is inverse to create the feeling of looking through a window into a spatial scene.
- Pointer motion is smoothed with interpolation; frames must not jump mechanically.
- Vertical cursor movement does not select a different camera angle. It may contribute only a very small secondary vertical shift, if retained after visual verification.
- On pointer leave, the view eases back to the frontal frame.

### Mobile control

- Do not request gyroscope or device-orientation permission.
- After the settled scene is available, a horizontal finger movement across the Hero controls the same inverse `-15°` to `+15°` view range.
- Vertical movement remains reserved for page scrolling and the existing intro scrub.
- Gesture ownership is state-dependent:
  - Before Hero reveal: vertical swipe advances the intro.
  - After Hero reveal: predominantly horizontal movement controls the spatial view.
  - Predominantly vertical movement continues normal page scrolling.
- On touch end, the spatial view eases back to the frontal frame.

### Seeking and seam handling

Because the frontal view crosses the end/start seam, raw `currentTime` interpolation cannot take the long path through the entire 360-degree video.

The implementation must:

- Convert normalized horizontal input into a signed angle.
- Map one side of the angle to the end segment and the other side to the beginning segment.
- Treat the seam as a continuous local timeline.
- Seek directly between the two short source windows without ever traversing the middle of the full video.
- Use `requestVideoFrameCallback` when supported and a `seeked` fallback otherwise.
- Keep a static frontal poster visible until the cycle video has enough data to present a stable frame.

## Reduced motion and failure behavior

- With `prefers-reduced-motion: reduce`, keep the frontal poster static and disable interactive video seeking.
- If `cycle.mp4` fails to load, keep `hero-poster 02` visible.
- The main navigation, Hero actions, page scrolling, and case-study interactions must remain usable when the cycle source fails.

## Full-page pointer light

- Move the existing supplied `light spot` visual out of the Hero-only coordinate system and mount it at application level.
- On fine-pointer desktop devices, it follows the cursor throughout the entire page, including Hero, Approach, Selected Work, Experience, Contact, and the visitor monitor.
- It remains visual-only: `pointer-events: none`, excluded from accessibility, and never blocks controls.
- Use viewport-fixed positioning so scroll position does not introduce coordinate drift.
- Hide it on coarse-pointer/mobile devices and when reduced motion is requested.
- Preserve velocity-sensitive scale/opacity, but keep brightness restrained over text-heavy sections.

## Contact section

- Replace the Contact background with `contact-bg 03`.
- Convert the source to an optimized web asset while preserving the supplied composition and aspect ratio.
- Change `Wechat：LKchat1980` from plain text to a copy button.
- Clicking it copies `LKchat1980`.
- Successful feedback reads `已复制微信号`; failure feedback reads `复制失败，请重试`.
- Preserve the inline Contact-details typography so the new button visually behaves like the adjacent email and phone items.
- Keep the existing `start a conversation` email-copy behavior.

## Experience section

- Set only the company-name column, the first item in each Experience row, to 100% white.
- Role and period retain their existing lower-contrast hierarchy.

## Tracking and accessibility

- The Contact WeChat copy control receives `data-track-label="Wechat: LKchat1980"` so it appears in click activity counts.
- Copy feedback remains inside the button's existing polite live region.
- The cycle video is decorative and hidden from assistive technology.
- Touch controls must not prevent vertical scrolling after the Hero is released.

## Verification

Automated checks should cover:

- Signed pointer-to-angle mapping and inverse direction.
- Seam-safe mapping to the two `cycle.mp4` time windows.
- Clamping to the `±15°` limit.
- Touch gesture axis classification.
- Reduced-motion and media-failure fallback.
- Contact WeChat copy value and tracking label.
- Full-page pointer-light mount and non-interactive behavior.
- Experience company-name selector.

Manual browser verification should cover:

- Center, left, and right settled-Hero views.
- Smooth return to center.
- No accidental traversal through the 360-degree middle frames.
- Mobile horizontal drag versus vertical page scroll.
- Contact background crop at desktop and mobile widths.
- Copy feedback and full-page pointer-light visibility.

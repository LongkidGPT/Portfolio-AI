# Hero Typewriter and Case Fit Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 修复案例长图弹窗适配，暂停 Hero Cycle 显示，增加主标题打字动画，替换鼠标光源，并建立 Geist Mono 英文字体系统。

**Architecture:** 案例图片回到浏览器原生宽高流，消除容器与图片的双重比例计算。Hero 通过显式功能开关保留 Cycle 集成，通过独立 `HeroTypewriter` 管理逐字输入与完成回调。Geist Mono 作为单个自托管可变 WOFF2 字体，由 CSS 字体令牌统一控制。

**Tech Stack:** React 19、Vite 6、CSS、Node.js test runner、JSDOM、agent-browser。

## Global Constraints

- 案例弹窗桌面宽度为 `860px`，窄视口宽度为 `100dvw - 24px`。
- Cycle 视频、Hook、映射模型和测试必须保留；当前页面只关闭挂载与事件接管。
- Hero 标题为两行 `Design for Business` / `Momentum`。
- 打字结束后光标闪烁约 `1000ms` 再消失，之后副标题和按钮依次出现。
- 鼠标光源使用项目根目录的 `light spot 02.png`，跟随逻辑保持不变。
- 页面英文使用 Geist Mono；标题 100、一般内容 200、章节标签 400。
- `LIVE SIGNAL` 使用 Geist Mono，但保留现有 Regular/Medium 字重。
- 中文继续回退到现有中文字体。
- 保留用户未提交的 `design-qa.md`，不得修改或提交。

---

### Task 1: 案例长图使用自然尺寸流

**Files:**
- Modify: `src/CaseStudyModal.jsx`
- Modify: `src/styles.css`
- Test: `tests/case-study-modal.dom.test.mjs`
- Test: `tests/page-shell.test.mjs`

**Interfaces:**
- Consumes: `caseStudy.slices: Array<{src: string, width: number, height: number}>`
- Produces: 每个案例图片具有真实 `width`/`height` 属性，并以 `width: 100%; height: auto` 排列。

- [ ] **Step 1: 写失败测试**

在渲染弹窗测试中断言首张图片的 `width="1720"`、`height="4096"`，切片节点没有内联 `aspect-ratio`。在 CSS 测试中断言文档使用 `min(860px, calc(100dvw - 24px))`，图片使用 `height: auto`。

- [ ] **Step 2: 运行测试并确认失败**

Run: `node --test tests/case-study-modal.dom.test.mjs tests/page-shell.test.mjs`

Expected: FAIL，原因是现有切片仍写入内联比例且图片高度为 `100%`。

- [ ] **Step 3: 最小实现**

将图片属性改为：

```jsx
<img
  src={source}
  width={slice.width}
  height={slice.height}
  {...accessibility.imageAttributes}
/>
```

移除切片内联 `aspectRatio`。CSS 使用：

```css
.case-study {
  overflow-x: hidden;
}

.case-study__document {
  width: min(860px, calc(100dvw - 24px));
  max-width: none;
}

.case-study__slice img {
  width: 100%;
  height: auto;
}
```

- [ ] **Step 4: 运行测试并确认通过**

Run: `node --test tests/case-study-modal.dom.test.mjs tests/page-shell.test.mjs`

Expected: PASS。

- [ ] **Step 5: 提交**

```bash
git add src/CaseStudyModal.jsx src/styles.css tests/case-study-modal.dom.test.mjs tests/page-shell.test.mjs
git commit -m "fix: keep case studies aligned with modal"
```

### Task 2: 暂停 Cycle 并实现 Hero 打字时序

**Files:**
- Create: `src/hero-features.js`
- Create: `src/HeroTypewriter.jsx`
- Modify: `src/HeroSection.jsx`
- Modify: `src/styles.css`
- Create: `tests/hero-typewriter.dom.test.mjs`
- Modify: `tests/hero-integration.test.mjs`
- Modify: `tests/page-shell.test.mjs`

**Interfaces:**
- Produces: `heroFeatures.cycleSpatialView: boolean`
- Produces: `<HeroTypewriter active onComplete />`
- Consumes: `onComplete()` 在字符完成且光标延迟结束后调用一次。

- [ ] **Step 1: 写失败测试**

新增 DOM 测试，验证：

```js
assert.equal(title.getAttribute("aria-label"), "Design for Business Momentum");
assert.match(title.textContent, /Design for Business/);
assert.equal(environment.pendingTimers(60), 1);
// 运行逐字计时器后：
assert.equal(environment.pendingTimers(1000), 1);
// 运行 1000ms 计时器后：
assert.equal(onCompleteCalls, 1);
assert.equal(document.querySelector(".hero-typewriter__cursor"), null);
```

集成测试断言功能开关为 `false` 时，渲染后的 Hero 没有 `.hero__cycle-scene`，但 `useCycleSpatialView` 和 Cycle 文件仍存在于源码中。

- [ ] **Step 2: 运行测试并确认失败**

Run: `node --test tests/hero-typewriter.dom.test.mjs tests/hero-integration.test.mjs tests/page-shell.test.mjs`

Expected: FAIL，原因是组件和功能开关尚不存在。

- [ ] **Step 3: 最小实现**

`hero-features.js`：

```js
export const heroFeatures = Object.freeze({
  cycleSpatialView: false,
});
```

`HeroTypewriter` 使用 `60ms` 逐字计时器和 `1000ms` 光标收尾计时器；两行分别保留最终宽度，视觉文本 `aria-hidden="true"`，`h1` 使用完整 `aria-label`。减少动态效果时立即完成。

`HeroSection`：

```jsx
const cycleEnabled = heroFeatures.cycleSpatialView;
useCycleSpatialView({
  heroRef,
  videoRef: cycleVideoRef,
  active: cycleEnabled && ["revealed", "released"].includes(heroState),
});

{cycleEnabled && <video className="hero__cycle-scene" ... />}
```

当 `HeroTypewriter` 完成时添加 `hero--type-complete`，再触发副标题、主按钮和微信按钮动画。页面标题文本改为英文标题式大小写。

- [ ] **Step 4: 运行测试并确认通过**

Run: `node --test tests/hero-typewriter.dom.test.mjs tests/hero-integration.test.mjs tests/page-shell.test.mjs tests/hero-scroll-scrub.dom.test.mjs`

Expected: PASS。

- [ ] **Step 5: 提交**

```bash
git add src/hero-features.js src/HeroTypewriter.jsx src/HeroSection.jsx src/App.jsx src/ExperienceSection.jsx src/ContactSection.jsx src/styles.css tests/hero-typewriter.dom.test.mjs tests/hero-integration.test.mjs tests/page-shell.test.mjs
git commit -m "feat: type the settled hero title"
```

### Task 3: 替换全页面鼠标光源

**Files:**
- Add: `public/assets/pointer-light-02.png`
- Modify: `src/PointerLight.jsx`
- Modify: `tests/pointer-light.dom.test.mjs`
- Modify: `tests/media-loading.test.mjs`

**Interfaces:**
- Consumes: `/Users/jade/Desktop/Longkid Folder/AIGC/Portflio Test 1.5/light spot 02.png`
- Produces: `/assets/pointer-light-02.png`

- [ ] **Step 1: 写失败测试**

更新 DOM 测试，断言指针图片 `src` 以 `/assets/pointer-light-02.png` 结尾；媒体测试要求新文件存在且保留 Alpha 通道。

- [ ] **Step 2: 运行测试并确认失败**

Run: `node --test tests/pointer-light.dom.test.mjs tests/media-loading.test.mjs`

Expected: FAIL，原因是组件仍引用旧素材且新资源尚未复制。

- [ ] **Step 3: 最小实现**

复制源素材为 `public/assets/pointer-light-02.png`，仅修改 `PointerLight.jsx` 的 `src`。不改变尺寸、速度响应、隐藏条件和 `pointer-events`。

- [ ] **Step 4: 运行测试并确认通过**

Run: `node --test tests/pointer-light.dom.test.mjs tests/media-loading.test.mjs`

Expected: PASS。

- [ ] **Step 5: 提交**

```bash
git add public/assets/pointer-light-02.png src/PointerLight.jsx tests/pointer-light.dom.test.mjs tests/media-loading.test.mjs
git commit -m "feat: update the global pointer light"
```

### Task 4: 自托管 Geist Mono 字体系统

**Files:**
- Add: `public/assets/fonts/geist-mono-variable.woff2`
- Add: `public/assets/fonts/OFL.txt`
- Modify: `src/styles.css`
- Modify: `src/App.jsx`
- Modify: `src/ExperienceSection.jsx`
- Modify: `src/ContactSection.jsx`
- Modify: `tests/page-shell.test.mjs`
- Modify: `tests/media-loading.test.mjs`

**Interfaces:**
- Consumes: Geist Mono v1.7.2 official WOFF2 and OFL license.
- Produces: CSS tokens `--font-mono`, `--font-cjk`; `@font-face` family `"Geist Mono"` weight `100 900`.

- [ ] **Step 1: 写失败测试**

测试真实输出规则：

```js
assert.match(css, /@font-face[\s\S]*Geist Mono[\s\S]*geist-mono-variable\.woff2/);
assert.match(cssDeclarations(css, ":root"), /font-family:\s*var\(--font-mono\)/);
assert.match(titleRules, /font-weight:\s*100/);
assert.match(cssDeclarations(css, ".section-label"), /font-weight:\s*400/);
assert.match(cssDeclarations(css, ".visitor-monitor"), /font-family:\s*var\(--font-mono\)/);
```

并断言页面标题文字为 `How I Move`、`Design Forward`、`Proof Through Projects`、`Across Brand,`、`Product and Market`、`Let's Talk`。

- [ ] **Step 2: 运行测试并确认失败**

Run: `node --test tests/page-shell.test.mjs tests/media-loading.test.mjs`

Expected: FAIL，原因是字体文件、声明、字重和标题大小写尚未更新。

- [ ] **Step 3: 获取官方字体并实现**

下载：

```bash
curl -L -o public/assets/fonts/geist-mono-variable.woff2 \
  'https://raw.githubusercontent.com/vercel/geist-font/v1.7.2/fonts/GeistMono/webfonts/GeistMono%5Bwght%5D.woff2'
curl -L -o public/assets/fonts/OFL.txt \
  'https://raw.githubusercontent.com/vercel/geist-font/v1.7.2/OFL.txt'
```

CSS：

```css
@font-face {
  font-family: "Geist Mono";
  src: url("/assets/fonts/geist-mono-variable.woff2") format("woff2");
  font-style: normal;
  font-weight: 100 900;
  font-display: swap;
}

:root {
  --font-mono: "Geist Mono", ui-monospace, monospace;
  --font-cjk: "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", sans-serif;
  font-family: var(--font-mono), var(--font-cjk);
  font-weight: 200;
}
```

页面级 `h1/h2` 使用 100，一般内容、导航、按钮、卡片及经历使用 200，章节标签使用 400。`LIVE SIGNAL` 只替换字体族，不修改已有 400/480/500/520/540 等权重。

- [ ] **Step 4: 运行测试并确认通过**

Run: `node --test tests/page-shell.test.mjs tests/media-loading.test.mjs`

Expected: PASS。

- [ ] **Step 5: 提交**

```bash
git add public/assets/fonts src/styles.css src/App.jsx src/ExperienceSection.jsx src/ContactSection.jsx tests/page-shell.test.mjs tests/media-loading.test.mjs
git commit -m "feat: apply the Geist Mono type system"
```

### Task 5: 完整验证

**Files:**
- Modify only if a verified defect is found.

**Interfaces:**
- Consumes: Tasks 1–4.
- Produces: green test/build and desktop/mobile visual evidence.

- [ ] **Step 1: 运行完整测试与构建**

Run:

```bash
npm test
npm run build
git diff --check
```

Expected: 0 failures，Vite build success，no whitespace errors。

- [ ] **Step 2: 桌面浏览器验证**

在 `1440×1000` 验证：

- Hero 最终只显示 Poster，网络请求中没有 `hero-cycle-front.mp4`。
- 标题逐字出现，光标在结束约 1 秒后消失，副标题和按钮随后出现。
- 页面标题为 Title Case，字体计算值为 `"Geist Mono"`，标题 100、正文 200、章节标签 400。
- 案例弹窗文档宽度 860px，图片与文档同宽。
- 新鼠标光源跟随且不拦截点击。

- [ ] **Step 3: 手机与缩放验证**

在 `390×844` 及桌面 125% 缩放等效窄视口验证：

- 案例弹窗无横向滚动。
- 文档、切片和图片宽度相等。
- Hero 不加载 Cycle。
- 减少动态效果下标题直接完整显示。

- [ ] **Step 4: 最终状态检查**

Run: `git status --short`

Expected: 仅保留用户原有 `M design-qa.md`。


import { activeVariant } from "./variants/active.js";

const basePrinciples = [
  {
    number: "01",
    title: "理解业务",
    description: "明确业务目标、产品核心卖点、用户使用场景以及市场沟通任务",
  },
  {
    number: "02",
    title: "拆解问题",
    description: "梳理传播重点、用户诉求、转化卡点、竞品分析",
  },
  {
    number: "03",
    title: "定义视觉方向",
    description: "将策略判断与分析结论转译为清晰、具有衡量指标的设计策略",
  },
  {
    number: "04",
    title: "推进落地交付",
    description: "跨部门协同内部团队、外部供应商并把控市场节奏，确保方案高质稳定落地",
  },
  {
    number: "05",
    title: "系统化沉淀",
    description: "总结项目经验，沉淀设计模板、资产库与可复用的规范规则",
  },
];

export const principles = basePrinciples.map((principle, index) => ({
  ...principle,
  description:
    activeVariant.principleDescriptions?.[index] ?? principle.description,
}));

export function resolveProjectArtwork(
  project,
  { canHover, hoverRequested },
) {
  if (canHover === null) {
    return {
      defaultSrc: undefined,
      hoverSrc: undefined,
    };
  }

  if (!canHover) {
    return {
      defaultSrc: undefined,
      hoverSrc: project.hoverImage,
    };
  }

  return {
    defaultSrc: project.defaultImage,
    hoverSrc: hoverRequested ? project.hoverImage : undefined,
  };
}

// 共享部分：图片、比例、id 等（各变体通用；会变的标题/描述放在 variants/<岗>.js）
const projectBase = {
  brand: {
    id: "brand",
    caseId: "brand",
    defaultImage: "/assets/work-brand-default.webp",
    hoverImage: "/assets/work-brand-hover.webp",
    artworkRatio: "3600 / 1860",
    temporaryArtworkRatio: "3600 / 1246",
  },
  marketing: {
    id: "marketing",
    caseId: "marketing",
    defaultImage: "/assets/work-marketing-default.webp",
    hoverImage: "/assets/work-marketing-hover.webp",
    artworkRatio: "1748 / 1602",
    temporaryArtworkRatio: "1748 / 929",
  },
  system: {
    id: "system",
    caseId: "system",
    defaultImage: "/assets/work-system-default.webp",
    hoverImage: "/assets/work-system-hover.webp",
    artworkRatio: "1748 / 1602",
    temporaryArtworkRatio: "1748 / 929",
  },
};

// 按当前变体的顺序 + 内容组合出 projects；宽卡由变体的 featured 决定
export const projects = activeVariant.projectOrder.map((id) => {
  const isFeatured = id === activeVariant.featured;
  const className = isFeatured ? "project-card--wide" : "";
  return {
    ...projectBase[id],
    ...activeVariant.projectContent[id],
    className,
  };
});

// 变体控制的文案（供 HeroSection / ContactSection 使用）
export const heroSubtitle = activeVariant.heroSubtitle;
export const footerTagline = activeVariant.footerTagline;
export const approachIntro =
  activeVariant.approachIntro ??
  "从判断问题开始，到定义方向、推动交付、沉淀方法";
export const workIntro =
  activeVariant.workIntro ??
  "以三个代表项目，呈现从业务拆解到全渠道落地的架构与闭环能力";

export const experience = [
  {
    company: "安克创新 Anker Innovations",
    role: "资深视觉设计师（充电储能品牌线）",
    period: "2023.12 – 2026.02",
  },
  {
    company: "林氏家居 Linsy",
    role: "设计主管（带 8 人团队）",
    period: "2021.06 – 2023.08",
  },
  {
    company: "熠思霆创意 Extend",
    role: "视觉设计组长（带 4 人团队）",
    period: "2018.02 – 2021.06",
  },
  {
    company: "GREY-DPI（Wpp）",
    role: "资深设计师",
    period: "2015.02 – 2018.01",
  },
  {
    company: "上海同立广告 Uni Group",
    role: "视觉设计师",
    period: "2011.12 – 2015.02",
  },
];

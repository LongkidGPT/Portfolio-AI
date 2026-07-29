export const principles = [
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

export const projects = [
  {
    id: "brand",
    caseId: "brand",
    className: "project-card--wide",
    defaultImage: "/assets/work-brand-default.webp",
    hoverImage: "/assets/work-brand-hover.webp",
    artworkRatio: "3600 / 1860",
    temporaryArtworkRatio: "3600 / 1246",
    title: "品牌系统｜视觉语言定义",
    description:
      "负责视觉系统中的光影、影像与场景规则模块，将既有品牌战略转化为跨品牌、跨团队的可执行应用方法，并参与全球市场落地",
  },
  {
    id: "marketing",
    caseId: "marketing",
    className: "",
    defaultImage: "/assets/work-marketing-default.webp",
    hoverImage: "/assets/work-marketing-hover.webp",
    artworkRatio: "1748 / 1602",
    temporaryArtworkRatio: "1748 / 929",
    title: "营销全案｜新品上市视觉",
    description: "面向北美市场的DTC落地页设计与数据驱动优化，Pre-Order点击率提升2.6倍",
  },
  {
    id: "system",
    caseId: "system",
    className: "",
    defaultImage: "/assets/work-system-default.webp",
    hoverImage: "/assets/work-system-hover.webp",
    artworkRatio: "1748 / 1602",
    temporaryArtworkRatio: "1748 / 929",
    title: "系统架构｜品牌包装规范",
    description: "构建可复用包装规范体系，品牌视觉识别度提升32%，新SKU接入效率提升40%",
  },
];

export const experience = [
  {
    company: "安克创新 Anker Innovations",
    role: "资深视觉设计师（充电储能品牌线）",
    period: "2023.12 – 2026.02",
  },
  {
    company: "林氏家居 Linsy",
    role: "设计主管（带 8 人团队）",
    period: "2021.06 – 2023.12",
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

// 默认 / 母版内容（= 现线上作品集，勿改，用于 VITE_VARIANT 未指定时）
export const heroSubtitle =
  "以视觉系统、上市传播与用户体验，推动品牌认知与业务转化";
export const footerTagline = "AIGC × Visual Design Expert";

// 项目展示顺序（用 projectBase 里的 id）
export const projectOrder = ["brand", "marketing", "system"];
export const featured = "brand"; // 哪个项目是宽卡 banner

// 每个项目「会变」的内容（标题 + 描述）；图片/比例等共享部分在 portfolio-data.js 的 projectBase
export const projectContent = {
  brand: {
    title: "品牌系统｜视觉语言定义",
    description:
      "负责视觉系统中的光影、影像与场景规则模块，将既有品牌战略转化为跨品牌、跨团队的可执行应用方法，并参与全球市场落地",
  },
  marketing: {
    title: "营销全案｜新品上市视觉",
    description:
      "面向北美市场的DTC落地页设计与数据驱动优化，Pre-Order点击率提升2.6倍",
  },
  system: {
    title: "系统架构｜品牌包装规范",
    description:
      "构建可复用包装规范体系，品牌视觉识别度提升32%，新SKU接入效率提升40%",
  },
};

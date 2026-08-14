import { activeVariant } from "./variants/active.js";

const defaultCaseStudyContent = {
  brand: {
    summary: {
      background: "多品牌全球化扩张需要统一、清晰且可执行的视觉语言。",
      responsibility: "负责光影、影像与场景规则模块，并推动跨品牌、跨团队应用。",
      outcome: "形成可复用的视觉规范，支持全球市场一致、高效落地。",
    },
  },
  marketing: {
    summary: {
      background: "新品面向北美市场，需要在 DTC 页面建立卖点认知与购买信心。",
      responsibility: "负责上市视觉、落地页信息表达与数据驱动的转化优化。",
      outcome: "优化关键信息与转化路径后，Pre-Order 点击率提升 2.6 倍。",
    },
  },
  system: {
    summary: {
      background: "多 SKU 包装扩张带来品牌识别不一致与接入效率问题。",
      responsibility: "构建可复用的包装规范、设计模板与跨团队执行规则。",
      outcome: "品牌视觉识别度提升 32%，新 SKU 接入效率提升 40%。",
    },
  },
};

export const caseStudyContent = Object.fromEntries(
  Object.entries(defaultCaseStudyContent).map(([id, content]) => [
    id,
    {
      ...content,
      summary: activeVariant.caseStudySummary?.[id] ?? content.summary,
    },
  ]),
);

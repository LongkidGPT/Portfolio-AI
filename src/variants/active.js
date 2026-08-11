// 变体选择器：构建时用 VITE_VARIANT 指定，未指定则用 default（= 基础页）
//   基础页构建：  npm run build
//   某岗构建：    VITE_VARIANT=<岗> npm run build
// 新增一个岗 = 在本目录加一个 <岗>.js，并在下面 import + variants 里各登记一行。
import * as defaultVariant from "./default.js";

const variants = {
  default: defaultVariant,
};

const requested = import.meta.env?.VITE_VARIANT || "default";
export const activeVariantName = variants[requested] ? requested : "default";
export const activeVariant = variants[activeVariantName];

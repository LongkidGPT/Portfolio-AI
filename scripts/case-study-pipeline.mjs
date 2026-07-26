const padSlice = (index) => String(index + 1).padStart(2, "0");

export function buildCaseStudyPlan(
  source,
  { maxWidth = 1720, maxSliceHeight = 4096, quality = 82 } = {},
) {
  const outputWidth = Math.min(source.width, maxWidth);
  const outputHeight = Math.round((source.height * outputWidth) / source.width);
  const sliceCount = Math.ceil(outputHeight / maxSliceHeight);
  const slices = Array.from({ length: sliceCount }, (_, index) => {
    const outputY = index * maxSliceHeight;
    const height = Math.min(maxSliceHeight, outputHeight - outputY);
    const sourceY = Math.round((outputY * source.height) / outputHeight);
    const nextSourceY = Math.round(
      ((outputY + height) * source.height) / outputHeight,
    );

    return {
      index,
      filename: `slice-${padSlice(index)}.webp`,
      src: `/assets/cases/${source.id}/slice-${padSlice(index)}.webp`,
      width: outputWidth,
      height,
      sourceY,
      sourceHeight: nextSourceY - sourceY,
      quality,
    };
  });

  return { ...source, outputWidth, outputHeight, slices };
}

export function renderCaseStudyManifest(plans) {
  const manifest = Object.fromEntries(
    plans.map((plan) => [
      plan.id,
      {
        id: plan.id,
        slices: plan.slices.map(({ src, width, height }) => ({
          src,
          width,
          height,
        })),
      },
    ]),
  );

  return `export const caseStudies = ${JSON.stringify(manifest, null, 2)};\n`;
}

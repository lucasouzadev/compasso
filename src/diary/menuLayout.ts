export type MenuProtectedBand = { top: number; bottom: number };

export function entryMenuLayout({
  screenHeight,
  safeTop,
  safeBottom,
  sourceTop,
  sourceHeight,
  actionCount,
  protectedBand,
}: {
  screenHeight: number;
  safeTop: number;
  safeBottom: number;
  sourceTop: number;
  sourceHeight: number;
  actionCount: number;
  protectedBand?: MenuProtectedBand;
}) {
  const gap = 8;
  const railHeight = 50;
  const contentHeight = actionCount * 44 + 8;
  let minTop = safeTop + railHeight + gap * 2;
  let bottom = screenHeight - safeBottom - gap;
  if (protectedBand) {
    const above = Math.min(bottom, protectedBand.top - gap);
    const below = Math.max(minTop, protectedBand.bottom + railHeight + gap * 2);
    const minimum = 44 + gap + 1;
    const desired = contentHeight + gap + sourceHeight;
    const belowSpace = bottom - below;
    const aboveSpace = above - minTop;
    if (
      belowSpace >= desired ||
      (belowSpace >= minimum && belowSpace >= aboveSpace)
    ) {
      minTop = below;
    } else if (aboveSpace >= minimum) {
      bottom = above;
    }
  }
  const actionsHeight = Math.min(
    contentHeight,
    Math.max(44, bottom - minTop - gap - Math.min(48, sourceHeight)),
  );
  const previewHeight = Math.min(
    sourceHeight,
    Math.max(1, bottom - minTop - gap - actionsHeight),
  );
  const top = Math.max(
    minTop,
    Math.min(sourceTop, bottom - previewHeight - gap - actionsHeight),
  );
  return {
    top,
    previewHeight,
    actionsHeight,
    contentHeight,
    railTop: top - railHeight - gap,
    menuTop: top + previewHeight + gap,
  };
}

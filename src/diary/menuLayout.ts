export function entryMenuLayout({
  screenHeight,
  safeTop,
  safeBottom,
  sourceTop,
  sourceHeight,
  actionCount,
}: {
  screenHeight: number;
  safeTop: number;
  safeBottom: number;
  sourceTop: number;
  sourceHeight: number;
  actionCount: number;
}) {
  const gap = 8;
  const railHeight = 50;
  const contentHeight = actionCount * 44 + 8;
  const minTop = safeTop + railHeight + gap * 2;
  const bottom = screenHeight - safeBottom - gap;
  const actionsHeight = Math.min(
    contentHeight,
    Math.max(44, bottom - minTop - gap - 48),
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

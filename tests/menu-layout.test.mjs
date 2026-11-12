import assert from "node:assert/strict";
import { test } from "node:test";
import { entryMenuLayout } from "../src/diary/menuLayout.ts";

test("message actions reserve the app header and the bottom safe area", () => {
  for (const screenHeight of [568, 667, 844, 932]) {
    for (const sourceTop of [0, 80, screenHeight - 60]) {
      const layout = entryMenuLayout({
        screenHeight,
        safeTop: 150,
        safeBottom: 34,
        sourceTop,
        sourceHeight: 900,
        actionCount: 6,
      });
      assert.ok(layout.railTop >= 150 + 8);
      assert.ok(layout.menuTop + layout.actionsHeight <= screenHeight - 34 - 8);
      assert.ok(layout.previewHeight > 0);
      assert.equal(layout.menuTop, layout.top + layout.previewHeight + 8);
      assert.ok(layout.actionsHeight <= layout.contentHeight);
    }
  }
});

test("short screens limit the visible menu and retain all action rows", () => {
  const layout = entryMenuLayout({
    screenHeight: 568,
    safeTop: 170,
    safeBottom: 34,
    sourceTop: 240,
    sourceHeight: 800,
    actionCount: 6,
  });
  assert.ok(layout.actionsHeight < layout.contentHeight);
  assert.equal(layout.contentHeight, 272);
});

test("calendar detail actions avoid the date on both small and tall sheets", () => {
  for (const scenario of [
    { top: 620, bottom: 680, sourceHeight: 40, above: true },
    { top: 250, bottom: 310, sourceHeight: 190, above: false },
  ]) {
    const layout = entryMenuLayout({
      screenHeight: 844,
      safeTop: 150,
      safeBottom: 34,
      sourceTop: scenario.bottom + 16,
      sourceHeight: scenario.sourceHeight,
      actionCount: 6,
      protectedBand: scenario,
    });
    if (scenario.above) {
      assert.ok(layout.menuTop + layout.actionsHeight < scenario.top);
    } else {
      assert.ok(layout.railTop > scenario.bottom);
    }
    assert.ok(layout.previewHeight > 0);
    assert.ok(layout.menuTop + layout.actionsHeight <= 844 - 34 - 8);
  }
});

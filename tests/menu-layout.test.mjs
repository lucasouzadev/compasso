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

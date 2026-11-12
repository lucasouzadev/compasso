import assert from "node:assert/strict";
import { test } from "node:test";
import {
  defaultReactions,
  parseQuickReactions,
  replaceQuickReaction,
} from "../src/diary/reactions.ts";

test("quick reaction changes replace a slot or swap an existing emoji without duplicates", () => {
  const replaced = replaceQuickReaction(defaultReactions, 1, "🦜");
  assert.deepEqual(replaced, ["👍", "🦜", "😂", "😮", "🙏"]);
  assert.deepEqual(replaceQuickReaction(replaced, 0, "🦜"), [
    "🦜",
    "👍",
    "😂",
    "😮",
    "🙏",
  ]);
  assert.equal(defaultReactions[1], "❤️");
});

test("saved quick reactions retain order and reject duplicate or malformed slots", () => {
  const selection = ["🌙", "🇧🇷", "❤️", "🏳️‍🌈", "👍🏽"];
  assert.deepEqual(
    parseQuickReactions(JSON.parse(JSON.stringify(selection))),
    selection,
  );
  assert.equal(
    parseQuickReactions(["🌙", ...selection.slice(0, 4)]),
    undefined,
  );
  assert.equal(parseQuickReactions(selection.slice(0, 4)), undefined);
  assert.equal(
    parseQuickReactions([...selection.slice(0, 4), "🌙 erro"]),
    undefined,
  );
});

import assert from "node:assert/strict";
import { test } from "node:test";
import { diarySearchSections } from "../src/diary/search.ts";
import {
  normalizeDiarySearch,
  readAvailableEntries,
} from "../src/diary/entries.ts";

const entries = [
  {
    id: "1-a",
    text: "Café na viagem",
    favorite: true,
    tags: ["Viagem"],
    createdAt: "2026-11-10T12:00:00.000Z",
  },
  {
    id: "2-b",
    text: "Café em casa",
    favorite: false,
    tags: ["Casa"],
    createdAt: "2026-11-10T11:00:00.000Z",
  },
  {
    id: "3-c",
    text: "Praia",
    favorite: true,
    tags: ["viagem"],
    createdAt: "2026-11-09T12:00:00.000Z",
  },
];
const rows = entries.map((entry) => ({
  entry,
  searchable: normalizeDiarySearch(entry.text),
}));
const ids = (sections) =>
  sections.flatMap(({ data }) => data.map(({ id }) => id));

test("search combines all words, favorites and exact normalized tags", () => {
  assert.deepEqual(
    ids(diarySearchSections(rows, "CAFE viagem", true, "VIAGEM")),
    ["1-a"],
  );
  assert.deepEqual(ids(diarySearchSections(rows, "café", false)), [
    "1-a",
    "2-b",
  ]);
  assert.deepEqual(ids(diarySearchSections(rows, "", true, "viagem")), [
    "1-a",
    "3-c",
  ]);
  assert.deepEqual(ids(diarySearchSections(rows, "café", false, "viag")), []);
  assert.deepEqual(ids(diarySearchSections(rows, "", false)), []);
});

test("clearing filters retains the query and favorite-only search retains day grouping", () => {
  assert.deepEqual(ids(diarySearchSections(rows, "café", true, "Casa")), []);
  assert.deepEqual(ids(diarySearchSections(rows, "café", false, undefined)), [
    "1-a",
    "2-b",
  ]);
  const sections = diarySearchSections(rows, "", true);
  assert.equal(sections.length, 2);
  assert.deepEqual(
    sections.map(({ data }) => data.length),
    [1, 1],
  );
  assert.deepEqual(ids(diarySearchSections([], "", true)), []);
});

test("one missing or unreadable entry cannot hide the readable day", () => {
  const values = new Map(entries.map((entry) => [entry.id, entry]));
  const result = readAvailableEntries(
    ["3-c", "broken", "missing", "1-a"],
    (id) => {
      if (id === "broken") throw new Error("invalid metadata");
      return values.get(id);
    },
  );
  assert.deepEqual(
    result.entries.map(({ id }) => id),
    ["1-a", "3-c"],
  );
  assert.equal(result.skipped, 2);
  assert.deepEqual(
    readAvailableEntries([], () => assert.fail()),
    { entries: [], skipped: 0 },
  );
  assert.deepEqual(
    readAvailableEntries(["missing"], () => undefined),
    { entries: [], skipped: 1 },
  );
});

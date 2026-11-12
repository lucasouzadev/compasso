// Synthetic CPU baseline only: no real journal, native I/O or image decoding.
import assert from "node:assert/strict";
import { performance } from "node:perf_hooks";
import {
  normalizeDiarySearch,
  readAvailableEntries,
} from "../src/diary/entries.ts";
import { diarySearchSections } from "../src/diary/search.ts";

const counts = [1000, 10000];
const samples = 30;
const measure = (run) => {
  for (let i = 0; i < 5; i++) run();
  const timings = Array.from({ length: samples }, () => {
    const start = performance.now();
    run();
    return performance.now() - start;
  }).sort((a, b) => a - b);
  return {
    medianMs: +timings[Math.floor(samples / 2)].toFixed(3),
    p95Ms: +timings[Math.ceil(samples * 0.95) - 1].toFixed(3),
  };
};
const results = counts.map((count) => {
  const entries = Array.from({ length: count }, (_, i) => ({
    id: `synthetic-${i}`,
    text: `${"Um pensamento sobre o dia. ".repeat(40)} ${i % 10 === 0 ? "Memória café" : "Rotina"}`,
    createdAt: new Date(Date.UTC(2025, 0, 1, 0, i)).toISOString(),
    favorite: i % 10 === 0,
    tags: [i % 10 === 0 ? "Reflexão" : "Cotidiano"],
  }));
  const records = new Map(
    entries.map((entry) => [entry.id, JSON.stringify(entry)]),
  );
  const ids = [...records.keys()];
  const read = (id) => JSON.parse(records.get(id));
  const rows = entries.map((entry) => ({
    entry,
    searchable: normalizeDiarySearch(entry.text),
  }));
  const search = () =>
    diarySearchSections(rows, "memoria cafe", true, "reflexao");
  assert.equal(search().flatMap((section) => section.data).length, count / 10);
  assert.equal(readAvailableEntries(ids, read).entries.length, count);
  return {
    count,
    charactersPerEntry: entries[0].text.length,
    parseAndSort: measure(() => readAvailableEntries(ids, read)),
    normalizeSearchRows: measure(() =>
      entries.map((entry) => normalizeDiarySearch(entry.text)),
    ),
    combinedSearch: measure(search),
  };
});
console.log(
  JSON.stringify(
    {
      node: process.version,
      platform: process.platform,
      arch: process.arch,
      samples,
      results,
    },
    null,
    2,
  ),
);

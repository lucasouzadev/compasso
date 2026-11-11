import { dayKey } from "../cookbooks/zest/data/diary.ts";
import {
  matchesDiaryTag,
  normalizeDiarySearch,
  type Entry,
} from "./entries.ts";

export type DiarySearchRow = { entry: Entry; searchable: string };

export function diarySearchSections(
  rows: readonly DiarySearchRow[],
  query: string,
  favorites: boolean,
  tag?: string,
) {
  const normalized = normalizeDiarySearch(query);
  if (!normalized && !favorites && !tag) return [];
  const terms = normalized.split(" ").filter(Boolean);
  const byDay = new Map<string, Entry[]>();
  for (const { entry, searchable } of rows) {
    if (
      (favorites && !entry.favorite) ||
      (tag && !matchesDiaryTag(entry, tag)) ||
      !terms.every((term) => searchable.includes(term))
    )
      continue;
    const day = dayKey(new Date(entry.createdAt));
    const entries = byDay.get(day) ?? [];
    entries.push(entry);
    byDay.set(day, entries);
  }
  return Array.from(byDay, ([day, data]) => ({ day, data }));
}

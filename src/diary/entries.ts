import { z } from "zod";
import { dayKey } from "../cookbooks/zest/data/diary.ts";

const photoName = z.string().regex(/^photo(?:-[0-9]+)?\.[a-z0-9]+$/);
export const entrySchema = z.object({
  id: z.string(),
  text: z.string(),
  createdAt: z.iso.datetime(),
  photo: photoName.optional(),
  continuationOf: z.string().optional(),
  quotedText: z.string().optional(),
  quotedPhotoCopy: z
    .string()
    .regex(/^quote\.[a-z0-9]+$/)
    .optional(),
  quotedPhoto: photoName.nullable().optional(),
  originalText: z.string().optional(),
  reaction: z.string().optional(),
  favorite: z.boolean().optional(),
  tags: z.array(z.string()).optional(),
});

export type Entry = z.infer<typeof entrySchema>;

export function quotedEntryText(entry: Entry, previous?: Entry) {
  return entry.quotedText ?? previous?.originalText ?? previous?.text;
}

export function normalizeDiarySearch(text: string) {
  return text
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLocaleLowerCase("pt-BR")
    .replace(/\s+/gu, " ")
    .trim();
}

export function parseDiaryTags(text: string) {
  const tags = new Map<string, string>();
  for (const part of text.split(",")) {
    const tag = part.trim();
    const key = normalizeDiarySearch(tag);
    if (key && !tags.has(key)) tags.set(key, tag);
  }
  return [...tags.values()];
}

export function collectDiaryTags(entries: readonly Entry[]) {
  const tags = new Map<string, string>();
  for (const entry of entries) {
    for (const tag of entry.tags ?? []) {
      const key = normalizeDiarySearch(tag);
      if (!tags.has(key)) tags.set(key, tag);
    }
  }
  return [...tags.values()].sort((a, b) => a.localeCompare(b, "pt-BR"));
}

export function matchesDiaryTag(entry: Entry, tag: string) {
  const key = normalizeDiarySearch(tag);
  return (
    entry.tags?.some((value) => normalizeDiarySearch(value) === key) ?? false
  );
}

export function entryDayFromId(id: string) {
  const match = /^(\d+)-[a-z0-9]*$/.exec(id);
  if (!match) return undefined;
  const date = new Date(Number(match[1]));
  return Number.isFinite(date.getTime()) ? dayKey(date) : undefined;
}

export function threadEntryIds(
  id: string,
  parents: ReadonlyMap<string, string>,
) {
  const path = new Set<string>();
  let root = id;
  while (!path.has(root)) {
    path.add(root);
    const parent = parents.get(root);
    if (!parent || path.has(parent)) break;
    root = parent;
  }

  const children = new Map<string, string[]>();
  for (const [child, parent] of parents) {
    const siblings = children.get(parent) ?? [];
    siblings.push(child);
    children.set(parent, siblings);
  }
  const ids = new Set([root]);
  for (const parent of ids) {
    for (const child of children.get(parent) ?? []) ids.add(child);
  }
  return [...ids];
}

// Keep an index into the original text while folding accents and whitespace.
// Searching the folded string directly would shift offsets in decomposed text.
export function diarySearchExcerpt(text: string, query: string, limit = 180) {
  const terms = normalizeDiarySearch(query).split(" ").filter(Boolean);
  if (!terms.length) {
    const excerpt = text.slice(0, limit).replace(/\s+/gu, " ").trim();
    return `${excerpt}${text.length > limit ? "…" : ""}`;
  }
  let folded = "";
  const offsets: number[] = [];
  let offset = 0;
  for (const character of text) {
    const normalized = character
      .normalize("NFD")
      .replace(/\p{M}/gu, "")
      .toLocaleLowerCase("pt-BR");
    for (const letter of normalized) {
      if (/\s/u.test(letter)) {
        if (folded.endsWith(" ")) continue;
        folded += " ";
      } else folded += letter;
      for (let unit = 0; unit < letter.length; unit++) offsets.push(offset);
    }
    offset += character.length;
  }
  const matches = terms
    .map((term) => folded.indexOf(term))
    .filter((at) => at >= 0);
  const match = matches.length ? offsets[Math.min(...matches)] : 0;
  let start = Math.max(0, match - 48);
  if (start) {
    const boundary = text.slice(start, match).search(/\s/u);
    if (boundary >= 0) start += boundary + 1;
  }
  const excerpt = text
    .slice(start, start + limit)
    .replace(/\s+/gu, " ")
    .trim();
  return `${start ? "…" : ""}${excerpt}${start + limit < text.length ? "…" : ""}`;
}

export function readAvailableEntries(
  ids: readonly string[],
  read: (id: string) => Entry | undefined,
) {
  const entries: Entry[] = [];
  let skipped = 0;
  for (const id of ids) {
    try {
      const entry = read(id);
      if (entry) entries.push(entry);
      else skipped++;
    } catch {
      skipped++;
    }
  }
  entries.sort(
    (a, b) =>
      b.createdAt.localeCompare(a.createdAt) || b.id.localeCompare(a.id),
  );
  return { entries, skipped };
}

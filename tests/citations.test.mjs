import assert from "node:assert/strict";
import { test } from "node:test";
import {
  protectQuoteSnapshots,
  quotePhotoName,
} from "../src/diary/citations.ts";
import {
  diarySearchExcerpt,
  entrySchema,
  quotedEntryText,
} from "../src/diary/entries.ts";

const source = {
  id: "1-a",
  text: "Revisado",
  originalText: "Antes",
  photo: "photo-2.jpg",
  createdAt: "2026-11-10T12:00:00.000Z",
};
const child = {
  id: "2-b",
  text: "Depois",
  continuationOf: source.id,
  createdAt: source.createdAt,
};

test("deleting a source first commits independent text and photo snapshots", () => {
  const events = [];
  let saved;
  protectQuoteSnapshots(
    source,
    [child, { ...child, id: "other", continuationOf: "elsewhere" }],
    {
      copy: (parent, photo, dependent, name) =>
        events.push([parent.id, photo, dependent.id, name]),
      commit: (entry) => {
        events.push("commit");
        saved = entrySchema.parse(JSON.parse(JSON.stringify(entry)));
      },
    },
  );
  assert.deepEqual(events, [
    ["1-a", "photo-2.jpg", "2-b", "quote.jpg"],
    "commit",
  ]);
  assert.equal(quotedEntryText(saved), "Antes");
  assert.equal(saved.quotedPhotoCopy, "quote.jpg");
  assert.equal(quotePhotoName("photo.heic"), "quote.heic");
});

test("existing quote snapshots survive source edits and are safe to retry", () => {
  const snapshot = {
    ...child,
    quotedText: "Minha citação",
    quotedPhoto: "photo.jpg",
  };
  let saved;
  protectQuoteSnapshots(source, [snapshot], {
    copy: (_, photo) => assert.equal(photo, "photo.jpg"),
    commit: (entry) => {
      saved = entry;
    },
  });
  assert.equal(saved.quotedText, "Minha citação");
  protectQuoteSnapshots(source, [saved], {
    copy: () => assert.fail("must not copy an owned snapshot twice"),
    commit: () => assert.fail("must not rewrite a complete snapshot"),
  });
  protectQuoteSnapshots(
    source,
    [{ ...child, quotedText: "", quotedPhoto: null }],
    {
      copy: () =>
        assert.fail("a text-only quote must not inherit a later photo"),
      commit: () =>
        assert.fail("an intentionally empty snapshot must stay empty"),
    },
  );
});

test("photo and metadata failures prevent callers from deleting a citation source", () => {
  let committed = false;
  assert.throws(
    () =>
      protectQuoteSnapshots(source, [child], {
        copy: () => {
          throw new Error("disk full");
        },
        commit: () => {
          committed = true;
        },
      }),
    /disk full/,
  );
  assert.equal(committed, false);
  assert.throws(
    () =>
      protectQuoteSnapshots(source, [child], {
        copy: () => {},
        commit: () => {
          throw new Error("publish failed");
        },
      }),
    /publish failed/,
  );
});

test("search excerpts reveal late matches with accents, line breaks and original spelling", () => {
  const text =
    "🌿 Introdução. ".repeat(80) + "Encontrei um Café\n  especial para voltar.";
  const snippet = diarySearchExcerpt(text, "CAFE especial");
  assert.ok(snippet.startsWith("…"));
  assert.match(snippet, /Café especial/);
  assert.ok(snippet.length <= 182);
  assert.match(diarySearchExcerpt(text.normalize("NFD"), "café"), /Cafe\u0301/);
  assert.equal(
    diarySearchExcerpt("Uma entrada curta", ""),
    "Uma entrada curta",
  );
  assert.equal(diarySearchExcerpt("", "ausente"), "");
});

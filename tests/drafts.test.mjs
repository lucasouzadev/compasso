import assert from "node:assert/strict";
import { test } from "node:test";
import { createDraftJournal } from "../src/diary/drafts.ts";

function fixture() {
  const values = new Map();
  let failPublish = false;
  const files = {
    keys: () => [...values.keys()],
    read: (key) => values.get(key),
    write: (key, value) => values.set(key, value),
    publish: (from, to) => {
      if (failPublish) throw new Error("disk failure");
      values.set(to, values.get(from));
      values.delete(from);
    },
    remove: (key) => values.delete(key),
  };
  return {
    values,
    files,
    fail: (value) => {
      failPublish = value;
    },
  };
}

const entry = {
  id: "1-a",
  text: "Antes",
  createdAt: "2026-11-10T12:00:00.000Z",
};
const draft = {
  version: 1,
  active: {
    text: "Continuando",
    photo: "file:///draft/image.jpg",
    previous: entry,
  },
  outside: { text: "Rascunho de Hoje" },
  focus: entry,
  editing: { entry, text: "Alteração", tags: "Viagem" },
};

test("reopening restores focus, outside draft, photo and independent edit", () => {
  const f = fixture();
  createDraftJournal(f.files).write(draft);
  assert.deepEqual(createDraftJournal(f.files).read(), draft);
});

test("interrupted publishing retains the last committed draft and supports retry", () => {
  const f = fixture();
  const journal = createDraftJournal(f.files);
  journal.write(draft);
  f.fail(true);
  assert.throws(() => journal.write({ ...draft, active: { text: "Novo" } }));
  assert.deepEqual(createDraftJournal(f.files).read(), draft);
  f.fail(false);
  journal.write({ ...draft, active: { text: "Novo" } });
  assert.equal(createDraftJournal(f.files).read().active.text, "Novo");
});

test("corrupt latest revision recovers previous snapshot and rejects total corruption", () => {
  const f = fixture();
  const journal = createDraftJournal(f.files);
  journal.write(draft);
  journal.write({ ...draft, active: { text: "" } });
  f.values.set("draft-2.json", "{");
  assert.deepEqual(journal.read(), draft);
  f.values.set("draft-1.json", "{");
  assert.throws(() => journal.read());
});

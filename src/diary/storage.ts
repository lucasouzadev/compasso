import { protectQuoteSnapshots, quotePhotoName } from "./citations";
import { createDraftJournal, type DiaryDraft } from "./drafts";
import { defaultReactions, parseQuickReactions } from "./reactions";
import { Directory, File, Paths } from "expo-file-system";
import {
  deleteAsync,
  moveAsync,
  writeAsStringAsync,
} from "expo-file-system/legacy";
import {
  entryDayFromId,
  entrySchema,
  readAvailableEntries,
  type Entry,
} from "./entries";

const root = () => new Directory(Paths.document, "compasso-entries");
const draftRoot = () => new Directory(Paths.document, "compasso-drafts");
const reactionRoot = () => new Directory(Paths.document, "compasso-reactions");

function reactionRevisions(directory: Directory) {
  return directory.exists
    ? directory
        .list()
        .flatMap((file) => {
          const match = /^reactions-(\d+)\.json$/.exec(file.name);
          return match && file instanceof File
            ? [{ file, revision: Number(match[1]) }]
            : [];
        })
        .sort((a, b) => b.revision - a.revision)
    : [];
}

export function readQuickReactions() {
  try {
    for (const { file } of reactionRevisions(reactionRoot())) {
      try {
        const reactions = parseQuickReactions(JSON.parse(file.textSync()));
        if (reactions) return reactions;
      } catch {
        // Keep looking for the previous readable preference.
      }
    }
  } catch {
    // The standard reactions are available before local storage is readable.
  }
  return defaultReactions;
}

export function writeQuickReactions(reactions: string[]) {
  if (!parseQuickReactions(reactions))
    throw new Error("Invalid quick reactions");
  const directory = reactionRoot();
  directory.create({ idempotent: true });
  const revisions = reactionRevisions(directory);
  const pending = new File(directory, "pending.json");
  pending.writeSync(JSON.stringify(reactions));
  pending.rename(`reactions-${(revisions[0]?.revision ?? 0) + 1}.json`);
  for (const { file } of revisions.slice(1)) {
    try {
      file.delete();
    } catch {
      // The new preference was already committed.
    }
  }
}
const journal = createDraftJournal({
  keys: () =>
    draftRoot().exists
      ? draftRoot()
          .list()
          .map((file) => file.name)
      : [],
  read: (key) => new File(draftRoot(), key).textSync(),
  write: (key, value) => {
    draftRoot().create({ idempotent: true });
    // The journal renames this file immediately after write returns.
    new File(draftRoot(), key).writeSync(value);
  },
  publish: (from, to) => new File(draftRoot(), from).rename(to),
  remove: (key) => new File(draftRoot(), key).delete(),
});

export const draftJournal = {
  read: journal.read,
  write(snapshot: DiaryDraft) {
    journal.write(snapshot);
    try {
      const files = draftRoot().list();
      const retained = new Set<string>();
      for (const file of files) {
        if (file instanceof File && /^draft-\d+\.json$/.test(file.name)) {
          const draft = JSON.parse(file.textSync()) as DiaryDraft;
          for (const photo of [
            draft.active.photo,
            draft.outside?.photo,
            draft.editing?.photo,
          ]) {
            if (photo) retained.add(photo);
          }
        }
      }
      for (const file of files) {
        if (
          file instanceof File &&
          file.name.startsWith("image-") &&
          !retained.has(file.uri)
        )
          file.delete();
      }
    } catch {
      // A committed snapshot remains valid if unused-photo cleanup fails.
    }
  },
};

export function keepDraftPhoto(uri: string) {
  draftRoot().create({ idempotent: true });
  const source = new File(uri);
  if (source.uri.startsWith(draftRoot().uri + "/")) return source.uri;
  const extension = /^\.[a-z0-9]+$/i.test(source.extension)
    ? source.extension
    : ".jpg";
  const copy = new File(
    draftRoot(),
    `image-${Date.now()}-${Math.random().toString(36).slice(2)}${extension}`,
  );
  source.copySync(copy);
  return copy.uri;
}

export function newEntryId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

const revisionPattern = /^revision-(\d+)\.json$/;

function latestRevision(directory: Directory) {
  return directory.list().reduce((latest, item) => {
    const match = revisionPattern.exec(item.name);
    return match ? Math.max(latest, Number(match[1])) : latest;
  }, 0);
}

function entryFile(id: string) {
  if (!/^\d+-[a-z0-9]*$/.test(id)) return undefined;
  const directory = new Directory(root(), id);
  if (!directory.exists) return undefined;
  const revision = latestRevision(directory);
  return new File(
    directory,
    revision ? `revision-${revision}.json` : "entry.json",
  );
}

export function readEntry(id: string) {
  const file = entryFile(id);
  return file ? entrySchema.parse(JSON.parse(file.textSync())) : undefined;
}

export async function findDayPhoto(
  ids: readonly string[],
  signal: AbortSignal,
) {
  for (const id of ids) {
    if (signal.aborted) return undefined;
    const file = entryFile(id);
    if (!file) continue;
    const entry = entrySchema.parse(JSON.parse(await file.text()));
    if (entry.photo) return entryPhotoUri(entry);
  }
  return undefined;
}

const openedDays = () => new Directory(Paths.document, "compasso-days");

export function rememberDay(day: string) {
  const directory = openedDays();
  directory.create({ idempotent: true });
  new Directory(directory, day).create({ idempotent: true });
}

export function readDayIndex() {
  const index = new Map<string, string[]>();
  const opened = openedDays();
  if (opened.exists) {
    for (const item of opened.list()) {
      if (/^\d{4}-\d{2}-\d{2}$/.test(item.name)) index.set(item.name, []);
    }
  }
  const directory = root();
  if (!directory.exists) return index;
  // Entry directories already carry their creation instant. Opening the app
  // only needs this index, without reading the text or images of past days.
  for (const item of directory.list()) {
    if (!(item instanceof Directory)) continue;
    const day = entryDayFromId(item.name);
    if (!day) continue;
    const ids = index.get(day) ?? [];
    ids.push(item.name);
    index.set(day, ids);
  }
  return index;
}

export function readDay(ids: readonly string[]) {
  return ids
    .map(readEntry)
    .filter((entry): entry is Entry => !!entry)
    .sort(
      (a, b) =>
        b.createdAt.localeCompare(a.createdAt) || b.id.localeCompare(a.id),
    );
}

export function readDayResult(ids: readonly string[]) {
  return readAvailableEntries(ids, readEntry);
}

export async function readSearchEntries(
  index: ReadonlyMap<string, readonly string[]>,
  signal: AbortSignal,
) {
  const entries: Entry[] = [];
  let skipped = 0;
  for (const ids of index.values()) {
    for (const id of ids) {
      if (signal.aborted) return { entries, skipped };
      try {
        const file = entryFile(id);
        if (!file) {
          skipped++;
          continue;
        }
        entries.push(entrySchema.parse(JSON.parse(await file.text())));
      } catch {
        skipped++;
      }
    }
  }
  entries.sort(
    (a, b) =>
      b.createdAt.localeCompare(a.createdAt) || b.id.localeCompare(a.id),
  );
  return { entries, skipped };
}

export async function readThreadLinks(
  ids: Iterable<string>,
  signal: AbortSignal,
) {
  const parents = new Map<string, string>();
  for (const id of ids) {
    if (signal.aborted) break;
    try {
      // The parent is immutable across edits, so the base record is enough.
      const file = new File(root(), id, "entry.json");
      const entry = entrySchema.parse(JSON.parse(await file.text()));
      if (entry.continuationOf) parents.set(id, entry.continuationOf);
    } catch {
      // A missing record need not prevent reading the rest of the thread.
    }
  }
  return parents;
}

export function entryPhotoUri(entry: Pick<Entry, "id" | "photo">) {
  return entry.photo ? new File(root(), entry.id, entry.photo).uri : undefined;
}

export function quotedPhotoUri(entry: Entry, previous?: Entry) {
  if (entry.quotedPhotoCopy)
    return new File(root(), entry.id, entry.quotedPhotoCopy).uri;
  const photo =
    entry.quotedPhoto === undefined ? previous?.photo : entry.quotedPhoto;
  return entry.continuationOf && photo
    ? entryPhotoUri({ id: entry.continuationOf, photo })
    : undefined;
}

export async function setEntryReaction(id: string, emoji: string) {
  const entry = readEntry(id);
  if (!entry) throw new Error("Entry unavailable");
  await saveEntryMetadata({
    ...entry,
    reaction: entry.reaction === emoji ? undefined : emoji,
  });
}

export async function toggleEntryFavorite(id: string) {
  const entry = readEntry(id);
  if (!entry) throw new Error("Entry unavailable");
  const updated = { ...entry, favorite: entry.favorite ? undefined : true };
  await saveEntryMetadata(updated);
  return updated;
}

async function saveEntryMetadata(entry: Entry) {
  const directory = new Directory(root(), entry.id);
  const next = latestRevision(directory) + 1;
  const pending = new File(directory, ".metadata-pending.json").uri;
  try {
    await writeAsStringAsync(pending, JSON.stringify(entry));
    await moveAsync({
      from: pending,
      to: new File(directory, `revision-${next}.json`).uri,
    });
  } catch (error) {
    await deleteAsync(pending, { idempotent: true }).catch(() => {});
    throw error;
  }
}

export function deleteEntries(ids: Iterable<string>) {
  const removed = new Set<string>();
  // Read all dependents before deleting anything; unreadable metadata must not
  // silently turn a deletion into loss of a surviving citation.
  let entries: Entry[];
  try {
    entries = [...readDayIndex().values()].flatMap((day) => readDay(day));
  } catch {
    return removed;
  }
  for (const id of ids) {
    if (!/^\d+-[a-z0-9]*$/.test(id)) continue;
    try {
      const directory = new Directory(root(), id);
      if (directory.exists) {
        const source = readEntry(id);
        if (!source) continue;
        protectQuoteSnapshots(source, entries, {
          copy: (parent, photo, child, name) => {
            const target = new File(root(), child.id, name);
            if (target.exists) target.delete();
            new File(root(), parent.id, photo).copySync(target);
          },
          commit: (child) => {
            const folder = new Directory(root(), child.id);
            const next = latestRevision(folder) + 1;
            const pending = new File(folder, ".quote-pending.json");
            pending.writeSync(JSON.stringify(child));
            pending.rename(`revision-${next}.json`);
          },
        });
        directory.delete();
      }
      removed.add(id);
    } catch {
      // The caller retains failed entries in the selection for retry.
    }
  }
  return removed;
}

export async function saveEntry(
  text: string,
  photoUri: string | undefined,
  previous: Entry | undefined,
  requestedId?: string,
) {
  const directory = root();
  directory.create({ idempotent: true });
  const id = requestedId ?? newEntryId();
  if (!/^\d+-[a-z0-9]+$/.test(id)) throw new Error("Invalid entry identifier");
  const existing = readEntry(id);
  if (existing) return existing;
  const date = new Date(Number(id.split("-")[0]));
  const pending = new Directory(directory, `.${id}`);
  const source = photoUri ? new File(photoUri) : undefined;
  const extension = source?.extension.toLowerCase();
  const photo = source
    ? `photo${extension && /^\.[a-z0-9]+$/.test(extension) ? extension : ".jpg"}`
    : undefined;
  const entry: Entry = {
    id,
    text,
    createdAt: date.toISOString(),
    photo,
    continuationOf: previous?.id,
    quotedText: previous?.text,
    quotedPhoto: previous ? (previous.photo ?? null) : undefined,
    quotedPhotoCopy: previous?.photo
      ? quotePhotoName(previous.photo)
      : undefined,
  };

  try {
    if (pending.exists) pending.delete();
    pending.create();
    if (source && photo) await source.copy(new File(pending, photo));
    if (previous?.photo && entry.quotedPhotoCopy) {
      await new File(root(), previous.id, previous.photo).copy(
        new File(pending, entry.quotedPhotoCopy),
      );
    }
    await new File(pending, "entry.json").write(JSON.stringify(entry));
    // Only publish the directory after both the entry and attachment are ready.
    pending.rename(id);
    return entry;
  } catch (error) {
    try {
      if (pending.exists) pending.delete();
    } catch {
      // An incomplete directory is ignored by readEntries.
    }
    throw error;
  }
}

export async function editEntry(
  entry: Entry,
  text: string,
  photoUri: string | undefined,
  tags: string[],
) {
  const current = readEntry(entry.id);
  if (!current) throw new Error("Entry unavailable");
  const directory = new Directory(root(), entry.id);
  const revision = latestRevision(directory) + 1;
  const replacement =
    photoUri && photoUri !== entryPhotoUri(entry)
      ? new File(photoUri)
      : undefined;
  const extension = replacement?.extension.toLowerCase() ?? "";
  const photo = replacement
    ? `photo-${revision}${/^\.[a-z0-9]+$/.test(extension) ? extension : ".jpg"}`
    : photoUri
      ? entry.photo
      : undefined;
  const updated = {
    ...current,
    tags: tags.length ? tags : undefined,
    text,
    photo,
    originalText: entry.originalText ?? entry.text,
  };
  const pending = new File(directory, ".revision-pending.json");
  const attachment =
    replacement && photo ? new File(directory, photo) : undefined;

  try {
    if (replacement && attachment) {
      if (attachment.exists) attachment.delete();
      await replacement.copy(attachment);
    }
    await pending.write(JSON.stringify(updated));
    // Publish the metadata last so interrupted edits leave the prior revision readable.
    pending.rename(`revision-${revision}.json`);
    return updated;
  } catch (error) {
    try {
      if (pending.exists) pending.delete();
      if (attachment?.exists) attachment.delete();
    } catch {
      // Unpublished files are ignored and can be replaced on retry.
    }
    throw error;
  }
}

import { quotedEntryText, type Entry } from "./entries.ts";

export function quotePhotoName(photo: string) {
  return `quote${photo.slice(photo.lastIndexOf("."))}`;
}

// Commit each dependent snapshot before deleting its source. A failure must
// propagate so the caller retains the source and can safely retry.
export function protectQuoteSnapshots(
  source: Entry,
  entries: readonly Entry[],
  files: {
    copy: (source: Entry, photo: string, child: Entry, name: string) => void;
    commit: (entry: Entry) => void;
  },
) {
  for (const entry of entries) {
    if (entry.continuationOf !== source.id) continue;
    const photo =
      entry.quotedPhoto === undefined ? source.photo : entry.quotedPhoto;
    let copy = entry.quotedPhotoCopy;
    if (photo && !copy) {
      copy = quotePhotoName(photo);
      files.copy(source, photo, entry, copy);
    }
    const text = quotedEntryText(entry, source);
    if (copy !== entry.quotedPhotoCopy || text !== entry.quotedText) {
      files.commit({ ...entry, quotedText: text, quotedPhotoCopy: copy });
    }
  }
}

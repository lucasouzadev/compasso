import { z } from "zod";
import { entrySchema } from "./entries.ts";

const composer = z.object({
  text: z.string(),
  photo: z.string().optional(),
  previous: entrySchema.optional(),
});
export const diaryDraftSchema = z.object({
  version: z.literal(1),
  active: composer,
  outside: composer.optional(),
  focus: entrySchema.optional(),
  editing: z
    .object({
      entry: entrySchema,
      text: z.string(),
      photo: z.string().optional(),
      tags: z.string(),
    })
    .optional(),
  submissionId: z.string().optional(),
});
export type DiaryDraft = z.infer<typeof diaryDraftSchema>;

export interface DraftFiles {
  keys(): string[];
  read(key: string): string;
  write(key: string, value: string): void;
  publish(from: string, to: string): void;
  remove(key: string): void;
}

export function createDraftJournal(files: DraftFiles) {
  function revisions() {
    return files
      .keys()
      .filter((key) => /^draft-\d+\.json$/.test(key))
      .sort((a, b) => Number(b.slice(6, -5)) - Number(a.slice(6, -5)));
  }
  return {
    read(): DiaryDraft | undefined {
      const keys = revisions();
      for (const key of keys) {
        try {
          return diaryDraftSchema.parse(JSON.parse(files.read(key)));
        } catch {
          // An older committed snapshot can recover an interrupted or corrupt write.
        }
      }
      if (keys.length) throw new Error("Draft snapshots unreadable");
      return undefined;
    },
    write(draft: DiaryDraft) {
      const keys = revisions();
      const next = Number(keys[0]?.slice(6, -5) ?? 0) + 1;
      files.write(
        "pending.json",
        JSON.stringify(diaryDraftSchema.parse(draft)),
      );
      files.publish("pending.json", `draft-${next}.json`);
      for (const key of keys.slice(1)) {
        try {
          files.remove(key);
        } catch {
          /* Cleanup can be retried after the next commit. */
        }
      }
    },
  };
}

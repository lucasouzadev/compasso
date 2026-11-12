export const defaultReactions = ["👍", "❤️", "😂", "😮", "🙏"];

export function parseQuickReactions(value: unknown): string[] | undefined {
  if (!Array.isArray(value) || value.length !== defaultReactions.length)
    return undefined;
  if (new Set(value).size !== value.length) return undefined;
  return value.every(
    (emoji): emoji is string =>
      typeof emoji === "string" &&
      emoji.length <= 24 &&
      /^(?:\p{Regional_Indicator}{2}|\p{Extended_Pictographic}\uFE0F?\p{Emoji_Modifier}?(?:\u200D\p{Extended_Pictographic}\uFE0F?\p{Emoji_Modifier}?)*)$/u.test(
        emoji,
      ),
  )
    ? value
    : undefined;
}

export function replaceQuickReaction(
  reactions: readonly string[],
  slot: number,
  emoji: string,
) {
  const next = [...reactions];
  const existing = next.indexOf(emoji);
  if (existing !== -1) next[existing] = next[slot];
  next[slot] = emoji;
  return next;
}

/** Lowercases and strips punctuation so "30 Days!" matches "30 days". */
export function normalizeWord(word: string): string {
  return word.toLowerCase().replace(/[^\p{L}\p{N}]/gu, '');
}

/** Splits a title on whitespace. Words keep their punctuation for display. */
export function splitWords(text: string): string[] {
  return text.split(/\s+/).filter((word) => word !== '');
}

/**
 * Finds the accent inside the title as a run of whole words, ignoring case and
 * punctuation. Returns the [start, end) word indexes, or undefined when the
 * accent is not a consecutive run of title words.
 */
export function findAccentRange(title: string, accent: string): [number, number] | undefined {
  const titleWords = splitWords(title).map(normalizeWord);
  const accentWords = splitWords(accent).map(normalizeWord).filter((w) => w !== '');
  if (accentWords.length === 0) return undefined;
  for (let start = 0; start + accentWords.length <= titleWords.length; start += 1) {
    if (accentWords.every((word, offset) => titleWords[start + offset] === word)) {
      return [start, start + accentWords.length];
    }
  }
  return undefined;
}

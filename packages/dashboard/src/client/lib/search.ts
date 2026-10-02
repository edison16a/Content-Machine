const fold = (value: string): string => value.normalize('NFKD').replace(/[̀-ͯ]/g, '').toLowerCase();

/**
 * Loose text matching for the video picker: every word typed must appear
 * somewhere in the text, in any order, ignoring case and accents. A word
 * like "#3" is a video number and matches "#003" exactly, never "#013".
 */
export function matchesQuery(text: string, query: string): boolean {
  const haystack = fold(text);
  const number = /^#(\d+)/.exec(haystack)?.[1];
  return fold(query)
    .split(/\s+/)
    .filter(Boolean)
    .every((word) => {
      const wanted = /^#(\d+)$/.exec(word)?.[1];
      if (wanted !== undefined) return number !== undefined && Number(number) === Number(wanted);
      return haystack.includes(word);
    });
}

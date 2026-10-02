/**
 * Loose text matching for the video picker: every word typed must appear
 * somewhere in the text, in any order, ignoring case and accents. "#3", "3"
 * and "tiny house" all find "#003 How We Built A Tiny House".
 */
export function matchesQuery(text: string, query: string): boolean {
  const fold = (value: string): string => value.normalize('NFKD').replace(/[̀-ͯ]/g, '').toLowerCase();
  const haystack = fold(text);
  return fold(query)
    .split(/\s+/)
    .filter(Boolean)
    .every((word) => haystack.includes(word.replace(/^#0*/, '')));
}

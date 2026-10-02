/**
 * Creates an SVG element. Like `h` in dom.ts, but SVG needs its own
 * namespace or the browser treats the tags as unknown HTML.
 */
export function svg<K extends keyof SVGElementTagNameMap>(
  tag: K,
  attributes: Record<string, string | number> = {},
  ...children: SVGElement[]
): SVGElementTagNameMap[K] {
  const element = document.createElementNS('http://www.w3.org/2000/svg', tag);
  for (const [key, value] of Object.entries(attributes)) element.setAttribute(key, String(value));
  element.append(...children);
  return element;
}

/** Text in an SVG, always as a text node so data can never become markup. */
export function svgText(attributes: Record<string, string | number>, text: string): SVGTextElement {
  const element = svg('text', attributes);
  element.textContent = text;
  return element;
}

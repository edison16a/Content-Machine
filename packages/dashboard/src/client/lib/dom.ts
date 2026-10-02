type Child = Node | string | null | undefined | false;
type Listeners = { [K in keyof HTMLElementEventMap]?: (event: HTMLElementEventMap[K]) => void };

export interface Props {
  class?: string;
  text?: string;
  on?: Listeners;
  [attribute: string]: string | number | boolean | undefined | Listeners;
}

/**
 * Creates an element. Text always goes in as text nodes, never HTML, so
 * titles and captions from the schedule cannot inject markup.
 */
export function h<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  props: Props = {},
  ...children: Child[]
): HTMLElementTagNameMap[K] {
  const element = document.createElement(tag);
  for (const [key, value] of Object.entries(props)) {
    if (key === 'on' && typeof value === 'object') {
      for (const [event, listener] of Object.entries(value))
        element.addEventListener(event, listener as EventListener);
    } else if (key === 'class' && typeof value === 'string') {
      element.className = value;
    } else if (key === 'text' && typeof value === 'string') {
      element.textContent = value;
    } else if (value === true) {
      element.setAttribute(key, '');
    } else if (typeof value === 'string' || typeof value === 'number') {
      element.setAttribute(key, String(value));
    }
  }
  for (const child of children) {
    if (child !== null && child !== undefined && child !== false) element.append(child);
  }
  return element;
}

/** Replaces all children of an element. */
export function replace(parent: Element, ...children: Child[]): void {
  parent.replaceChildren(
    ...children.filter((c): c is Node | string => c !== null && c !== undefined && c !== false),
  );
}

/** An image that is decorative unless given alt text. */
export function img(src: string, alt = '', className = ''): HTMLImageElement {
  return h('img', { src, alt, class: className, decoding: 'async', draggable: 'false' });
}

/** Writes to the clipboard, falling back to a hidden textarea for file:// pages. */
export async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    const area = h('textarea', { class: 'visually-hidden', readonly: true });
    area.value = text;
    document.body.append(area);
    area.select();
    // Deprecated but still the only clipboard path on some file:// pages.
    // eslint-disable-next-line @typescript-eslint/no-deprecated
    const ok = document.execCommand('copy');
    area.remove();
    return ok;
  }
}

/** Swaps a button's label to confirm an action, then puts it back. */
export function flashLabel(button: HTMLElement, label: string, ms = 1500): void {
  const target = button.querySelector('.label') ?? button;
  const original = target.textContent;
  target.textContent = label;
  window.setTimeout(() => {
    target.textContent = original;
  }, ms);
}

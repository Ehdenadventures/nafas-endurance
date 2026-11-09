import { Fragment } from "react";

/*
 * Simple text styling for product texts, written in the admin with the B and colour buttons:
 *   **bold words**      {blue}coloured words{/blue}
 * Everything else is shown as plain text (no HTML), so nothing typed can break the page.
 */

export const TEXT_COLOURS = {
  blue: "var(--accent)",
  navy: "var(--ink)",
  red: "var(--bad)",
  green: "var(--good)",
  orange: "var(--rt-orange)",
} as const;
export type TextColour = keyof typeof TEXT_COLOURS;

const TOKEN = /\*\*([\s\S]+?)\*\*|\{(blue|navy|red|green|orange)\}([\s\S]*?)\{\/\2\}/;

export function Rich({ text }: { text: string }) {
  const out: React.ReactNode[] = [];
  let rest = text;
  let k = 0;
  while (rest) {
    const m = TOKEN.exec(rest);
    if (!m) { out.push(rest); break; }
    if (m.index) out.push(rest.slice(0, m.index));
    if (m[1] !== undefined) out.push(<strong key={k++} className="font-bold text-ink"><Rich text={m[1]} /></strong>);
    else out.push(<span key={k++} style={{ color: TEXT_COLOURS[m[2] as TextColour] }}><Rich text={m[3]} /></span>);
    rest = rest.slice(m.index + m[0].length);
  }
  return <>{out.map((x, i) => <Fragment key={i}>{x}</Fragment>)}</>;
}

/** The text without the styling marks, e.g. for search engines. */
export const plainText = (text: string) =>
  text.replace(/\*\*([\s\S]+?)\*\*/g, "$1").replace(/\{\/?(blue|navy|red|green|orange)\}/g, "");

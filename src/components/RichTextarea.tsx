"use client";
import { useRef } from "react";
import { TEXT_COLOURS, type TextColour } from "./RichText";

/** A text box with a B (bold) button and colour buttons that style the selected words. */
export default function RichTextarea({ value, onChange, rows = 4, id, label }: { value: string; onChange: (v: string) => void; rows?: number; id?: string; label?: string }) {
  const ref = useRef<HTMLTextAreaElement>(null);
  function wrap(open: string, close: string) {
    const el = ref.current;
    if (!el) return;
    const { selectionStart: a, selectionEnd: b } = el;
    const picked = value.slice(a, b) || "text";
    onChange(value.slice(0, a) + open + picked + close + value.slice(b));
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(a + open.length, a + open.length + picked.length);
    });
  }
  return (
    <div className="rounded-xl border border-line bg-surface focus-within:border-accent">
      <div className="flex flex-wrap items-center gap-1 border-b border-line px-2 py-1">
        <button type="button" onClick={() => wrap("**", "**")} className="h-8 w-8 rounded-md font-extrabold hover:bg-surface-2" aria-label="Bold" title="Bold: select words, then tap">B</button>
        <span className="mx-1 h-5 w-px bg-line" />
        {(Object.keys(TEXT_COLOURS) as TextColour[]).map((c) => (
          <button key={c} type="button" onClick={() => wrap(`{${c}}`, `{/${c}}`)} className="flex h-8 w-8 items-center justify-center rounded-md hover:bg-surface-2" aria-label={`Colour ${c}`} title={`${c[0].toUpperCase() + c.slice(1)}: select words, then tap`}>
            <span className="h-4 w-4 rounded-full" style={{ background: TEXT_COLOURS[c] }} />
          </button>
        ))}
        <span className="ml-auto hidden text-xs text-ink-3 sm:inline">Select words, then tap B or a colour</span>
      </div>
      <textarea ref={ref} id={id} aria-label={label} rows={rows} value={value} onChange={(e) => onChange(e.target.value)}
        className="block w-full resize-y rounded-b-xl bg-transparent px-3 py-2 outline-none" />
    </div>
  );
}

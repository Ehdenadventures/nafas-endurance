"use client";
import { useId, useState } from "react";
import type { Detail } from "@/lib/types";
import { Rich } from "./RichText";

/** Text with "|" between columns becomes a table (handy for nutritional values). */
function Body({ text }: { text: string }) {
  const blocks: { table: boolean; lines: string[] }[] = [];
  for (const line of text.split(/\r?\n/)) {
    const table = line.includes("|");
    const last = blocks[blocks.length - 1];
    if (!line.trim()) { if (last && !last.table) blocks.push({ table: false, lines: [] }); continue; }
    if (last && last.table === table) last.lines.push(line);
    else blocks.push({ table, lines: [line] });
  }
  return (
    <div className="space-y-3">
      {blocks.filter((b) => b.lines.length).map((b, i) =>
        b.table ? (
          <div key={i} className="overflow-x-auto">
            <table className="w-full min-w-[20rem] text-sm">
              <tbody>
                {b.lines.map((l, r) => {
                  const cells = l.split("|").map((c) => c.trim());
                  const Cell = r === 0 ? "th" : "td";
                  return (
                    <tr key={r} className={r === 0 ? "border-b-2 border-line text-left" : "border-b border-line"}>
                      {cells.map((c, k) => <Cell key={k} className={`px-2 py-1.5 ${k ? "text-right" : "text-left"}`}><Rich text={c} /></Cell>)}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <p key={i} className="whitespace-pre-line"><Rich text={b.lines.join("\n")} /></p>
        ),
      )}
    </div>
  );
}

export default function ProductTabs({ details }: { details: Detail[] }) {
  const tabs = details.filter((d) => d.body.trim());
  const [on, setOn] = useState(0);
  const id = useId();
  if (!tabs.length) return null;
  const move = (i: number) => {
    const n = (i + tabs.length) % tabs.length;
    setOn(n);
    document.getElementById(`${id}-t${n}`)?.focus();
  };
  return (
    <section className="mt-12 overflow-hidden rounded-2xl border border-line bg-surface">
      <div role="tablist" aria-label="Product information" className="flex overflow-x-auto border-b border-line bg-surface-2">
        {tabs.map((t, i) => (
          <button
            key={t.title + i}
            id={`${id}-t${i}`}
            role="tab"
            type="button"
            aria-selected={on === i}
            aria-controls={`${id}-p${i}`}
            tabIndex={on === i ? 0 : -1}
            onClick={() => setOn(i)}
            onKeyDown={(e) => {
              if (e.key === "ArrowRight") move(i + 1);
              else if (e.key === "ArrowLeft") move(i - 1);
            }}
            className={`shrink-0 px-4 py-3 text-sm font-bold uppercase tracking-wide transition ${on === i ? "bg-accent text-white" : "text-ink-3 hover:text-ink"}`}
          >
            {t.title}
          </button>
        ))}
      </div>
      {tabs.map((t, i) => (
        <div key={t.title + i} id={`${id}-p${i}`} role="tabpanel" aria-labelledby={`${id}-t${i}`} hidden={on !== i} className="p-5 leading-relaxed text-ink-2">
          <Body text={t.body} />
        </div>
      ))}
    </section>
  );
}

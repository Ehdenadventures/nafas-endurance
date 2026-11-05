"use client";
import { useState } from "react";

export default function CopyLink({ url }: { url: string }) {
  const [done, setDone] = useState(false);
  return (
    <button
      type="button"
      className="ml-1 rounded-md border border-line bg-surface px-2 py-0.5 text-xs font-semibold"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(url);
          setDone(true);
          setTimeout(() => setDone(false), 1500);
        } catch {
          prompt("Copy this link:", url);
        }
      }}
    >
      {done ? "Copied" : "Copy"}
    </button>
  );
}

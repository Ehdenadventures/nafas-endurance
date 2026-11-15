"use client";

export default function DeleteOrderButton({ number }: { number: number }) {
  return (
    <button
      onClick={(e) => { if (!confirm(`Delete order #${number}? This can't be undone.`)) e.preventDefault(); }}
      className="text-sm text-ink-3 underline hover:text-bad"
    >
      Delete order
    </button>
  );
}

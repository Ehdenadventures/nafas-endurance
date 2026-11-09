import { FEATURES, type FeatureKey } from "@/lib/types";

/** Round badges like "Gluten free". Ones the product doesn't have are shown faded. */
export default function FeatureBadges({ features }: { features: FeatureKey[] }) {
  if (!features.length) return null;
  const has = new Set(features);
  return (
    <ul className="mt-10 grid grid-cols-4 gap-2 sm:gap-6" aria-label="Product features">
      {FEATURES.map((f) => {
        const on = has.has(f.key);
        return (
          <li key={f.key} className={`flex justify-center ${on ? "" : "opacity-25 grayscale"}`} aria-hidden={!on}>
            <span className={`flex aspect-square w-full max-w-28 flex-col items-center justify-center rounded-full border-4 p-2 text-center ${on ? "border-accent text-accent" : "border-ink-3 text-ink-3"}`}>
              <span className="text-[0.6rem] font-semibold uppercase tracking-widest sm:text-xs">{on ? "✓" : ""}</span>
              <span className="text-xs font-extrabold leading-tight sm:text-base">{f.label}</span>
            </span>
          </li>
        );
      })}
    </ul>
  );
}

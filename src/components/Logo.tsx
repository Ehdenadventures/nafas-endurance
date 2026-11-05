/** Nafas Endurance wordmark: a breath swoosh plus the name. `onDark` uses white text. */
export default function Logo({ height = 26, onDark = false }: { height?: number; onDark?: boolean }) {
  const fs = Math.round(height * 0.8);
  return (
    <span className="inline-flex items-center whitespace-nowrap" style={{ gap: height * 0.3, height }} role="img" aria-label="Nafas Endurance">
      <svg height={height * 0.8} viewBox="0 0 56 28" aria-hidden="true">
        <path d="M3 18c7-13 15-13 22-4s16 9 28-6" fill="none" stroke="var(--pink)" strokeWidth="5" strokeLinecap="round" />
      </svg>
      <span style={{ fontSize: fs, fontWeight: 800, letterSpacing: "0.02em", color: onDark ? "#fff" : "var(--ink)" }}>NAFAS</span>
      <span style={{ fontSize: fs * 0.62, fontWeight: 400, letterSpacing: "0.18em", color: onDark ? "#d6ff4a" : "var(--accent)" }}>ENDURANCE</span>
    </span>
  );
}

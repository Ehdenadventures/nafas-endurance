/** Nafas Endurance logo: blue NAFAS with the Arabic نفس overlay on the yellow badge. Works on light and dark backgrounds. */
export default function Logo({ height = 40 }: { height?: number; onDark?: boolean }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src="/logo.svg" alt="Nafas Endurance" height={height} width={Math.round(height * 2.75)} style={{ height, width: "auto" }} className="block" />
  );
}

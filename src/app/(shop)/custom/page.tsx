import type { Metadata } from "next";
import { WhatsAppIcon } from "@/components/Icons";
import { site, whatsappLink } from "@/lib/site";

export const metadata: Metadata = { title: "Custom orders", description: "Have an idea or a 3D file? We design and print it for you." };

const steps = [
  ["Send your idea", "A photo, a sketch, a broken part, or an STL file. Tell us the size and colour you want."],
  ["Get a price", "We reply on WhatsApp with a price and how long it takes, usually within a day."],
  ["We print it", "Once you confirm, we print and deliver it. You pay cash on delivery."],
];

export default function CustomPage() {
  const wa = whatsappLink(`Hi ${site.name}, I'd like a custom print:\n- What it is:\n- Size:\n- Colour:\n- Quantity:`);
  return (
    <div className="mx-auto max-w-3xl pt-10">
      <h1 className="text-4xl font-extrabold tracking-tight">Custom 3D printing</h1>
      <p className="mt-3 text-lg text-ink-2">Name keychains, replacement parts, trophies, gifts, prototypes. If you can describe it, we can probably print it.</p>
      <ol className="mt-8 grid gap-4 sm:grid-cols-3">
        {steps.map(([t, d], i) => (
          <li key={t} className="rounded-2xl border border-line bg-surface p-5">
            <span className="text-sm font-bold text-accent">Step {i + 1}</span>
            <h2 className="mt-1 font-bold">{t}</h2>
            <p className="mt-1 text-sm text-ink-2">{d}</p>
          </li>
        ))}
      </ol>
      {wa ? (
        <a href={wa} target="_blank" rel="noopener noreferrer" className="btn btn-primary mt-8 text-base">
          <WhatsAppIcon /> Start a custom order on WhatsApp
        </a>
      ) : (
        <p className="mt-8 text-ink-3">WhatsApp number not set yet (NEXT_PUBLIC_WHATSAPP_NUMBER).</p>
      )}
    </div>
  );
}

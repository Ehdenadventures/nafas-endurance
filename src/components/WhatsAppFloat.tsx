import { whatsappLink } from "@/lib/site";
import { WhatsAppIcon } from "./Icons";

export default function WhatsAppFloat() {
  const href = whatsappLink("Hi Nafas Endurance, I have a question");
  if (!href) return null;
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" aria-label="Ask us on WhatsApp"
      className="fixed bottom-4 right-4 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-[#25D366] text-white shadow-lg hover:brightness-105">
      <WhatsAppIcon className="h-7 w-7" />
    </a>
  );
}

import Link from "next/link";
import { brandsOf, getCategories } from "@/lib/data";
import { site, whatsappLink } from "@/lib/site";
import Logo from "./Logo";
import { FacebookIcon, InstagramIcon, TikTokIcon, WhatsAppIcon } from "./Icons";

export default async function Footer() {
  const brands = brandsOf(await getCategories());
  const wa = whatsappLink("Hi Nafas Endurance, I have a question");
  const social = [
    site.instagram && { href: `https://instagram.com/${site.instagram}`, label: `@${site.instagram}`, Icon: InstagramIcon },
    site.facebook && { href: site.facebook, label: "Facebook", Icon: FacebookIcon },
    site.tiktok && { href: site.tiktok, label: "TikTok", Icon: TikTokIcon },
    wa && { href: wa, label: "WhatsApp", Icon: WhatsAppIcon },
  ].filter(Boolean) as { href: string; label: string; Icon: typeof InstagramIcon }[];
  return (
    <footer className="mt-16 border-t border-line bg-surface">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-10 sm:grid-cols-3">
        <div>
          <Logo height={32} />
          <p className="mt-1 text-sm text-ink-2">{site.tagline}. Cash on delivery all over Lebanon.</p>
        </div>
        <div className="text-sm">
          <p className="font-semibold">Brands</p>
          <ul className="mt-2 space-y-1 text-ink-2">
            {brands.map((c) => <li key={c.id}><Link href={`/c/${c.slug}`} className="hover:text-ink">{c.name}</Link></li>)}
            <li><Link href="/ig" className="hover:text-ink">Shop our Instagram</Link></li>
          </ul>
        </div>
        <div className="text-sm">
          <p className="font-semibold">Follow us</p>
          <ul className="mt-2 space-y-2">
            {social.map(({ href, label, Icon }) => (
              <li key={label}>
                <a href={href} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 text-ink-2 hover:text-ink">
                  <Icon /> {label}
                </a>
              </li>
            ))}
          </ul>
        </div>
      </div>
      <p className="border-t border-line py-4 text-center text-xs text-ink-3">© {new Date().getFullYear()} {site.name}</p>
    </footer>
  );
}

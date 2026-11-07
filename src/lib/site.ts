// Shop settings. Change them in .env (or in Vercel > Settings > Environment Variables).
const env = (k: string, d = "") => process.env[k] || d;

export const site = {
  name: "Nafas Endurance",
  tagline: "Energy gels and race fuel for endurance athletes",
  url: env("NEXT_PUBLIC_SITE_URL", "https://nafasendurance.com"),
  // WhatsApp number in international format without + or spaces, e.g. 96170123456
  whatsapp: env("NEXT_PUBLIC_WHATSAPP_NUMBER"),
  instagram: env("NEXT_PUBLIC_INSTAGRAM", "nafas.endurance"),
  facebook: env("NEXT_PUBLIC_FACEBOOK_URL"),
  tiktok: env("NEXT_PUBLIC_TIKTOK_URL"),
  currency: "USD",
  deliveryFee: Number(env("NEXT_PUBLIC_DELIVERY_FEE_USD", "4")),
};

export const whatsappLink = (text: string) =>
  site.whatsapp ? `https://wa.me/${site.whatsapp}?text=${encodeURIComponent(text)}` : "";

export const money = (n: number) => `$${(Math.round(n * 100) / 100).toFixed(2).replace(/\.00$/, "")}`;

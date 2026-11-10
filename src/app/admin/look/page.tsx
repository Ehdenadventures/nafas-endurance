import { requireAdmin } from "@/lib/auth";
import { bannerProducts, getBanner, getProducts, isDemo } from "@/lib/data";
import AdminNav from "../AdminNav";
import BannerForm from "./BannerForm";

export const dynamic = "force-dynamic";

export default async function LookAdmin() {
  await requireAdmin();
  const [banner, products] = await Promise.all([getBanner(), getProducts()]);
  const slides = [
    { key: "main", label: "First slide (logo and welcome text)" },
    ...bannerProducts(products).map((p) => ({ key: p.id, label: p.name, photo: p.media.find((m) => m.type === "image")?.url })),
  ];
  return (
    <>
      <AdminNav active="look" />
      <main className="mx-auto max-w-3xl space-y-4 px-4 py-6">
        <h1 className="text-2xl font-bold">Home banner</h1>
        <p className="text-sm text-ink-2">Give each slide of the big rotating banner its own background picture (for example a race, a road or a trail). For each one, choose how strong it shows and which part of the picture stays in view. Slides without their own picture use the default picture at the top.</p>
        <BannerForm initial={banner} slides={slides} uploads={!isDemo()} />
      </main>
    </>
  );
}

import { requireAdmin } from "@/lib/auth";
import { getBanner, isDemo } from "@/lib/data";
import AdminNav from "../AdminNav";
import BannerForm from "./BannerForm";

export const dynamic = "force-dynamic";

export default async function LookAdmin() {
  await requireAdmin();
  const banner = await getBanner();
  return (
    <>
      <AdminNav active="look" />
      <main className="mx-auto max-w-3xl space-y-4 px-4 py-6">
        <h1 className="text-2xl font-bold">Home banner</h1>
        <p className="text-sm text-ink-2">Add a picture behind the big rotating banner on the home page (for example a race, a road or a trail). Use the slider to make it lighter or stronger so the text stays easy to read.</p>
        <BannerForm initial={banner} uploads={!isDemo()} />
      </main>
    </>
  );
}

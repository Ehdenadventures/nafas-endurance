export const dynamic = "force-dynamic";

import Header from "@/components/Header";
import Footer from "@/components/Footer";
import WhatsAppFloat from "@/components/WhatsAppFloat";

export default function ShopLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {/* Soft Nafas symbol behind the whole shop. */}
      <div aria-hidden className="shop-backdrop" />
      <Header />
      <main className="mx-auto max-w-6xl px-4">{children}</main>
      <Footer />
      <WhatsAppFloat />
    </>
  );
}

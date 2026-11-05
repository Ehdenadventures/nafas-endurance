import type { Metadata } from "next";
import { site } from "@/lib/site";
import CheckoutForm from "./CheckoutForm";

export const metadata: Metadata = { title: "Checkout" };

export default function CheckoutPage() {
  return <CheckoutForm deliveryFee={site.deliveryFee} />;
}

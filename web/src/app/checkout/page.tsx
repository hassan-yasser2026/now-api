import type { Metadata } from "next";
import { requireCustomer } from "@/lib/server-api";
import { CheckoutForm } from "./checkout-form";

export const metadata: Metadata = {
  title: "إتمام الطلب",
  robots: { index: false, follow: false },
};

export default async function CheckoutPage() {
  await requireCustomer("/checkout");
  return <CheckoutForm />;
}

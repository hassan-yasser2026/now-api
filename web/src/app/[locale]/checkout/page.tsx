import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { requireCustomer } from "@/lib/server-api";
import { CheckoutForm } from "./checkout-form";

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: (await getTranslations("checkout"))("title"),
    robots: { index: false, follow: false },
  };
}

export default async function CheckoutPage() {
  await requireCustomer("/checkout");
  return <CheckoutForm />;
}

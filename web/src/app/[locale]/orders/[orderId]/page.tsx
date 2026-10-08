import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { CustomerNavbar } from "@/components/customer-navbar";
import { OrderDetails } from "./order-details";
import { requireCustomer } from "@/lib/server-api";

type OrderPageProps = {
  params: Promise<{ locale: string; orderId: string }>;
};

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: (await getTranslations("orderDetails"))("details"),
    robots: { index: false, follow: false },
  };
}

export default async function OrderPage({ params }: OrderPageProps) {
  const { orderId } = await params;
  if (!Number.isSafeInteger(Number(orderId)) || Number(orderId) <= 0) {
    notFound();
  }

  await requireCustomer(`/orders/${orderId}`);

  return (
    <>
      <CustomerNavbar signedIn />
      <OrderDetails orderId={Number(orderId)} />
    </>
  );
}

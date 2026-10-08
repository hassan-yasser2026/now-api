import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CustomerNavbar } from "@/components/customer-navbar";
import { OrderDetails } from "./order-details";
import { requireCustomer } from "@/lib/server-api";

type OrderPageProps = {
  params: Promise<{ orderId: string }>;
};

export const metadata: Metadata = {
  title: "تفاصيل الطلب",
  robots: { index: false, follow: false },
};

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

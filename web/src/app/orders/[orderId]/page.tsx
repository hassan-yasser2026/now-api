import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { OrderDetails } from "./order-details";
import styles from "./order-details.module.css";
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
    <main className={styles.page}>
      <header className={styles.header}>
        <Link className={styles.brand} href="/">
          NOW
        </Link>
        <Link className={styles.backLink} href="/orders">
          كل طلباتي
        </Link>
      </header>
      <OrderDetails orderId={Number(orderId)} />
    </main>
  );
}

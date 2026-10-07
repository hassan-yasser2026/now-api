import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { CustomerNav } from "@/components/customer-nav";
import { formatPrice } from "@/lib/api";
import {
  getCustomerOrders,
  getCustomerSession,
} from "@/lib/server-api";
import styles from "./orders-page.module.css";

export const metadata: Metadata = {
  title: "طلباتي",
  robots: { index: false, follow: false },
};

type OrderRecord = {
  id: number;
  status: string;
  totalPrice: number | string;
  createdAt?: string;
  store?: { name?: string };
  items?: Array<{
    id: number;
    quantity: number;
    menuItem?: { name?: string; nameAr?: string | null };
  }>;
};

function asOrder(value: unknown): OrderRecord | null {
  if (!value || typeof value !== "object") return null;
  const order = value as Partial<OrderRecord>;
  if (
    !Number.isSafeInteger(order.id) ||
    typeof order.status !== "string" ||
    (typeof order.totalPrice !== "number" &&
      typeof order.totalPrice !== "string")
  ) {
    return null;
  }
  return order as OrderRecord;
}

function orderStatus(status: string) {
  const labels: Record<string, string> = {
    PENDING: "بانتظار قبول المتجر",
    ACCEPTED: "تم قبول الطلب",
    PREPARING: "جارٍ التحضير",
    READY: "الطلب جاهز",
    PICKED_UP: "استلمه المندوب",
    ON_THE_WAY: "في الطريق إليك",
    DELIVERED: "تم التوصيل",
    CANCELLED: "ملغي",
  };
  return labels[status] || status.replaceAll("_", " ");
}

function orderDate(value: string | undefined) {
  if (!value) return "تاريخ غير متاح";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "تاريخ غير متاح";

  return new Intl.DateTimeFormat("ar-EG", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

export default async function OrdersPage() {
  const session = await getCustomerSession();
  if (!session) redirect("/login?next=%2Forders");

  let orders: unknown[];
  let loadError: string | null = null;
  try {
    orders = await getCustomerOrders(session.user.id, session.token);
  } catch (error) {
    console.error("Failed to load customer orders:", error);
    orders = [];
    loadError =
      error instanceof Error
        ? error.message
        : "تعذر تحميل الطلبات. حاول مرة أخرى.";
  }

  const validOrders = orders.map(asOrder).filter((order) => order !== null);

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <Link className={styles.brand} href="/">
          NOW
        </Link>
        <CustomerNav signedIn />
      </header>
      <section className={styles.content}>
        <p className={styles.eyebrow}>حساب العميل</p>
        <h1>طلباتي</h1>
        <p className={styles.intro}>
          أهلاً {session.user.name}، تقدر تتابع حالة طلباتك هنا.
        </p>

        {loadError ? (
          <div className={styles.error} role="alert">
            <strong>تعذر تحميل الطلبات</strong>
            <p>{loadError}</p>
          </div>
        ) : validOrders.length === 0 ? (
          <div className={styles.empty}>
            <h2>لسه ماعندكش طلبات</h2>
            <p>لما تعمل طلب، هتلاقي تفاصيله وحالته هنا.</p>
            <Link href="/">تصفح المتاجر</Link>
          </div>
        ) : (
          <div className={styles.orderList}>
            {validOrders.map((order) => (
              <article className={styles.orderCard} key={order.id}>
                <div className={styles.orderHeading}>
                  <div>
                    <span className={styles.orderNumber}>طلب رقم #{order.id}</span>
                    <h2>{order.store?.name || "متجر NOW"}</h2>
                  </div>
                  <span className={styles.status}>{orderStatus(order.status)}</span>
                </div>
                {Array.isArray(order.items) && order.items.length > 0 && (
                  <ul className={styles.items}>
                    {order.items.map((item) => (
                      <li key={item.id}>
                        {item.menuItem?.nameAr ||
                          item.menuItem?.name ||
                          "منتج"}{" "}
                        × {item.quantity}
                      </li>
                    ))}
                  </ul>
                )}
                <div className={styles.orderFooter}>
                  <span>{orderDate(order.createdAt)}</span>
                  <strong>{formatPrice(order.totalPrice)}</strong>
                </div>
                <Link
                  className={styles.orderDetailsLink}
                  href={`/orders/${order.id}`}
                >
                  تفاصيل الطلب وتتبعه
                </Link>
              </article>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}

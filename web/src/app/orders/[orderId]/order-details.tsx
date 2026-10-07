"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { formatPrice } from "@/lib/api";
import styles from "./order-details.module.css";

type OrderItem = {
  id: number;
  quantity: number;
  priceAtOrder?: number | string;
  menuItem?: { name?: string; nameAr?: string | null };
};

type Order = {
  id: number;
  status: string;
  address?: string;
  totalPrice: number | string;
  subtotal?: number | string;
  deliveryFee?: number | string;
  platformCommission?: number | string;
  createdAt?: string;
  updatedAt?: string;
  store?: { name?: string };
  items: OrderItem[];
};

type OrderEnvelope = {
  success?: boolean;
  message?: string;
  data?: Order;
};

const STATUS_LABELS: Record<string, string> = {
  PENDING: "بانتظار قبول المتجر",
  ACCEPTED: "تم قبول الطلب",
  PREPARING: "جارٍ التحضير",
  READY: "الطلب جاهز",
  PICKED_UP: "استلمه المندوب",
  ON_THE_WAY: "في الطريق إليك",
  DELIVERED: "تم التوصيل",
  CANCELLED: "ملغي",
};

function formatDate(value?: string) {
  if (!value) return "غير متاح";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "غير متاح";
  return new Intl.DateTimeFormat("ar-EG", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

export function OrderDetails({ orderId }: { orderId: number }) {
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [lastUpdated, setLastUpdated] = useState("");
  const inFlight = useRef(false);

  const refresh = useCallback(async () => {
    if (inFlight.current) return;
    inFlight.current = true;
    try {
      const response = await fetch(`/api/orders/${orderId}`, {
        cache: "no-store",
      });
      let envelope: OrderEnvelope;
      try {
        envelope = (await response.json()) as OrderEnvelope;
      } catch {
        throw new Error("استجابة غير صالحة من خدمة NOW");
      }
      if (!response.ok || envelope.success === false) {
        throw new Error(envelope.message || "تعذر تحميل تفاصيل الطلب.");
      }
      const data = envelope.data;
      if (
        !data ||
        data.id !== orderId ||
        typeof data.status !== "string" ||
        !Array.isArray(data.items)
      ) {
        throw new Error("تفاصيل الطلب المستلمة غير مكتملة.");
      }
      setOrder(data);
      setError("");
      setLastUpdated(new Date().toISOString());
    } catch (loadError) {
      console.error("Could not refresh customer order:", loadError);
      setError(
        loadError instanceof Error
          ? loadError.message
          : "تعذر تحديث حالة الطلب.",
      );
    } finally {
      setLoading(false);
      inFlight.current = false;
    }
  }, [orderId]);

  useEffect(() => {
    const initialRefresh = window.setTimeout(() => void refresh(), 0);
    const interval = window.setInterval(() => void refresh(), 30_000);
    return () => {
      window.clearTimeout(initialRefresh);
      window.clearInterval(interval);
    };
  }, [refresh]);

  return (
    <section className={styles.content} aria-labelledby="order-title">
      <p className={styles.eyebrow}>متابعة طلبك</p>
      <h1 id="order-title">الطلب رقم #{orderId}</h1>

      {loading && !order ? (
        <p className={styles.info}>جارٍ تحميل تفاصيل الطلب…</p>
      ) : error && !order ? (
        <div className={styles.error} role="alert">
          <p>{error}</p>
          <button type="button" onClick={() => void refresh()}>
            إعادة المحاولة
          </button>
          <Link href="/login">تسجيل الدخول</Link>
        </div>
      ) : order ? (
        <>
          {error && (
            <p className={styles.refreshError} role="status">
              تعذر تحديث الحالة الآن؛ سنحاول مجددًا تلقائيًا.
            </p>
          )}
          <article className={styles.card}>
            <div className={styles.heading}>
              <div>
                <p className={styles.storeName}>
                  {order.store?.name || "متجر NOW"}
                </p>
                <p className={styles.muted}>
                  أُنشئ في {formatDate(order.createdAt)}
                </p>
              </div>
              <span className={styles.status}>
                {STATUS_LABELS[order.status] || order.status.replaceAll("_", " ")}
              </span>
            </div>

            <section className={styles.section} aria-labelledby="order-items">
              <h2 id="order-items">المنتجات</h2>
              <ul className={styles.items}>
                {order.items.map((item, index) => (
                  <li key={item.id || `${orderId}-${index}`}>
                    <span>
                      {item.menuItem?.nameAr || item.menuItem?.name || "منتج"} ×{" "}
                      {item.quantity}
                    </span>
                    {item.priceAtOrder !== undefined && (
                      <strong>
                        {formatPrice(
                          Number(item.priceAtOrder) * Number(item.quantity),
                        )}
                      </strong>
                    )}
                  </li>
                ))}
              </ul>
            </section>

            <section className={styles.section} aria-labelledby="order-delivery">
              <h2 id="order-delivery">عنوان التوصيل</h2>
              <p>{order.address || "العنوان غير متاح"}</p>
            </section>

            <section className={styles.section} aria-labelledby="order-summary">
              <h2 id="order-summary">ملخص المبلغ</h2>
              {order.subtotal !== undefined && (
                <div>
                  <span>مجموع المنتجات</span>
                  <strong>{formatPrice(order.subtotal)}</strong>
                </div>
              )}
              {Number(order.deliveryFee) > 0 && (
                <div>
                  <span>رسوم التوصيل</span>
                  <strong>{formatPrice(order.deliveryFee!)}</strong>
                </div>
              )}
              {Number(order.platformCommission) > 0 && (
                <div>
                  <span>رسوم الخدمة</span>
                  <strong>{formatPrice(order.platformCommission!)}</strong>
                </div>
              )}
              <div className={styles.total}>
                <span>الإجمالي</span>
                <strong>{formatPrice(order.totalPrice)}</strong>
              </div>
            </section>
          </article>
          <div className={styles.footer}>
            <p>
              تحديث تلقائي كل 30 ثانية
              {lastUpdated && ` · آخر تحديث ${formatDate(lastUpdated)}`}
            </p>
            <button type="button" onClick={() => void refresh()}>
              تحديث الآن
            </button>
          </div>
        </>
      ) : null}
    </section>
  );
}

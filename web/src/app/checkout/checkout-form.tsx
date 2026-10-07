"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import { formatPrice, getSafeImageUrl } from "@/lib/api";
import { useCart } from "@/components/cart-provider";
import styles from "./checkout-page.module.css";

const DELIVERY_INFO_KEY = "now_customer_web_delivery_info_v1";

type DeliveryInfo = {
  address: string;
  latitude: number | null;
  longitude: number | null;
};

type ApiEnvelope<T> = {
  success?: boolean;
  data?: T;
  message?: string;
};

function parseDeliveryInfo(value: string | null): DeliveryInfo {
  if (!value) return { address: "", latitude: null, longitude: null };
  const parsed: unknown = JSON.parse(value);
  if (!parsed || typeof parsed !== "object") {
    throw new Error("بيانات العنوان المحفوظة غير صالحة");
  }
  const info = parsed as Record<string, unknown>;
  const latitude = info.latitude;
  const longitude = info.longitude;

  if (
    typeof info.address !== "string" ||
    (latitude !== null &&
      (typeof latitude !== "number" ||
        !Number.isFinite(latitude) ||
        latitude < -90 ||
        latitude > 90)) ||
    (longitude !== null &&
      (typeof longitude !== "number" ||
        !Number.isFinite(longitude) ||
        longitude < -180 ||
        longitude > 180)) ||
    (latitude === null) !== (longitude === null)
  ) {
    throw new Error("بيانات العنوان المحفوظة غير صالحة");
  }

  return {
    address: info.address,
    latitude: latitude as number | null,
    longitude: longitude as number | null,
  };
}

export function CheckoutForm() {
  const router = useRouter();
  const { items, error: cartError, clearCart } = useCart();
  const [delivery, setDelivery] = useState<DeliveryInfo>({
    address: "",
    latitude: null,
    longitude: null,
  });
  const [ready, setReady] = useState(false);
  const [locationBusy, setLocationBusy] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const subtotal = useMemo(
    () => items.reduce((sum, item) => sum + item.price * item.quantity, 0),
    [items],
  );
  const storeId = items[0]?.storeId;
  const locationSelected =
    delivery.latitude !== null && delivery.longitude !== null;

  useEffect(() => {
    const timer = window.setTimeout(() => {
      try {
        setDelivery(
          parseDeliveryInfo(window.localStorage.getItem(DELIVERY_INFO_KEY)),
        );
      } catch (loadError) {
        console.error("Could not read saved customer delivery details:", loadError);
        setError("تعذر تحميل العنوان المحفوظ. أدخل العنوان وحدد الموقع مجددًا.");
      } finally {
        setReady(true);
      }
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  function updateDelivery(next: DeliveryInfo) {
    setDelivery(next);
    try {
      window.localStorage.setItem(DELIVERY_INFO_KEY, JSON.stringify(next));
      setError("");
    } catch (storageError) {
      console.error("Could not save customer delivery details:", storageError);
      setError("تعذر حفظ العنوان على هذا الجهاز.");
    }
  }

  function requestLocation() {
    if (!navigator.geolocation) {
      setError("المتصفح لا يدعم تحديد الموقع. جرّب متصفحًا آخر.");
      return;
    }

    setLocationBusy(true);
    setError("");
    navigator.geolocation.getCurrentPosition(
      (position) => {
        updateDelivery({
          ...delivery,
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        });
        setLocationBusy(false);
      },
      (locationError) => {
        console.error("Browser location request failed:", locationError);
        setError(
          locationError.code === locationError.PERMISSION_DENIED
            ? "يلزم السماح للموقع بالوصول إلى موقعك لإتمام الطلب."
            : "تعذر تحديد الموقع. تحقق من إعدادات الجهاز وحاول مرة أخرى.",
        );
        setLocationBusy(false);
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 60000 },
    );
  }

  async function submitOrder(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting) return;

    const cleanAddress = delivery.address.trim();
    if (!cleanAddress || cleanAddress.length < 5 || cleanAddress.length > 500) {
      setError("اكتب عنوان توصيل صحيحًا بين 5 و500 حرف.");
      return;
    }
    if (!locationSelected) {
      setError("حدد موقع التوصيل من المتصفح قبل تأكيد الطلب.");
      return;
    }
    if (!storeId || items.length === 0) {
      setError("السلة فارغة. أضف منتجات قبل إتمام الطلب.");
      return;
    }

    setSubmitting(true);
    setError("");
    try {
      const response = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          storeId,
          address: cleanAddress,
          latitude: delivery.latitude,
          longitude: delivery.longitude,
          paymentMethod: "CASH_ON_DELIVERY",
          items: items.map((item) => ({
            menuItemId: item.productId,
            quantity: item.quantity,
          })),
        }),
      });

      let envelope: ApiEnvelope<{ id?: number }>;
      try {
        envelope = (await response.json()) as ApiEnvelope<{ id?: number }>;
      } catch {
        throw new Error("استجابة غير صالحة من خدمة NOW");
      }

      if (!response.ok || envelope.success === false) {
        throw new Error(envelope.message || "تعذر إنشاء الطلب. حاول مرة أخرى.");
      }
      if (!Number.isSafeInteger(envelope.data?.id) || !envelope.data?.id) {
        throw new Error("لم يصل رقم الطلب من خدمة NOW.");
      }

      clearCart();
      router.replace(`/orders/${envelope.data.id}`);
      router.refresh();
    } catch (submitError) {
      console.error("Could not create customer order:", submitError);
      setError(
        submitError instanceof Error
          ? submitError.message
          : "حدث خطأ أثناء إرسال الطلب. حاول مرة أخرى.",
      );
      setSubmitting(false);
    }
  }

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <Link className={styles.brand} href="/">
          NOW
        </Link>
        <Link className={styles.backLink} href="/cart">
          الرجوع للسلة
        </Link>
      </header>

      <form className={styles.content} onSubmit={submitOrder}>
        <div className={styles.heading}>
          <p className={styles.eyebrow}>الخطوة الأخيرة</p>
          <h1>إتمام الطلب</h1>
        </div>

        {(error || cartError) && (
          <p className={styles.error} role="alert">
            {error || cartError}
          </p>
        )}

        {!ready ? (
          <p className={styles.info}>جارٍ تحميل بيانات التوصيل المحفوظة…</p>
        ) : items.length === 0 ? (
          <section className={styles.empty}>
            <h2>سلتك فارغة</h2>
            <p>أضف منتجات إلى السلة قبل إتمام الطلب.</p>
            <Link href="/">تصفح المتاجر</Link>
          </section>
        ) : (
          <>
            <section className={styles.section} aria-labelledby="items-title">
              <h2 id="items-title">محتويات الطلب</h2>
              <p className={styles.storeName}>من متجر {items[0].storeName}</p>
              <div className={styles.items}>
                {items.map((item) => {
                  const imageUrl = getSafeImageUrl(item.image);
                  return (
                    <article className={styles.item} key={item.productId}>
                      <div className={styles.image}>
                        {imageUrl ? (
                          <Image
                            src={imageUrl}
                            alt=""
                            fill
                            sizes="64px"
                            unoptimized
                          />
                        ) : (
                          <span aria-hidden="true">NOW</span>
                        )}
                      </div>
                      <div>
                        <h3>{item.name}</h3>
                        <p>
                          {formatPrice(item.price)} × {item.quantity}
                        </p>
                      </div>
                      <strong>{formatPrice(item.price * item.quantity)}</strong>
                    </article>
                  );
                })}
              </div>
            </section>

            <section className={styles.section} aria-labelledby="address-title">
              <h2 id="address-title">عنوان التوصيل</h2>
              <label className={styles.field}>
                <span>العنوان بالتفصيل</span>
                <textarea
                  value={delivery.address}
                  onChange={(event) =>
                    updateDelivery({ ...delivery, address: event.target.value })
                  }
                  minLength={5}
                  maxLength={500}
                  required
                  rows={3}
                  placeholder="المنطقة، الشارع، رقم المبنى، وأي علامة مميزة"
                />
              </label>
              <div className={styles.locationRow}>
                <button
                  className={styles.locationButton}
                  type="button"
                  onClick={requestLocation}
                  disabled={locationBusy}
                >
                  {locationBusy
                    ? "جارٍ تحديد الموقع…"
                    : locationSelected
                      ? "تحديث موقعي"
                      : "تحديد موقعي"}
                </button>
                <span
                  className={
                    locationSelected ? styles.locationSuccess : styles.locationHint
                  }
                  role="status"
                >
                  {locationSelected
                    ? "تم حفظ إحداثيات الموقع على هذا الجهاز."
                    : "مطلوب السماح للموقع بالوصول إلى موقعك."}
                </span>
              </div>
              <p className={styles.info}>
                العنوان والإحداثيات محفوظة محليًا في هذا المتصفح، وتُرسل مع
                الطلب. لا يوجد حاليًا API لحفظ دفتر عناوين العميل.
              </p>
            </section>

            <section className={styles.section} aria-labelledby="payment-title">
              <h2 id="payment-title">طريقة الدفع</h2>
              <div className={styles.payment}>
                <span className={styles.radio} aria-hidden="true" />
                <span>
                  <strong>الدفع نقدًا عند الاستلام</strong>
                  <small>طريقة الدفع المتاحة في تطبيق NOW الحالي.</small>
                </span>
              </div>
            </section>

            <aside className={styles.summary} aria-label="ملخص الطلب">
              <h2>ملخص الطلب</h2>
              <div>
                <span>مجموع المنتجات التقديري</span>
                <strong>{formatPrice(subtotal)}</strong>
              </div>
              <div>
                <span>رسوم التوصيل</span>
                <strong>يحددها النظام إن وجدت</strong>
              </div>
              <p>
                الأسعار النهائية يحسبها الخادم عند إنشاء الطلب. لا يعرض الـ API
                الحالي تقدير رسوم التوصيل قبل التأكيد.
              </p>
              <button
                className={styles.submit}
                type="submit"
                disabled={
                  !ready ||
                  submitting ||
                  items.length === 0 ||
                  !locationSelected
                }
              >
                {submitting ? "جارٍ تأكيد الطلب…" : "تأكيد الطلب"}
              </button>
            </aside>
          </>
        )}
      </form>
    </main>
  );
}

"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import {
  formatPrice,
  getSafeImageUrl,
  shouldUnoptimizeImage,
} from "@/lib/api";
import { useCart } from "@/components/cart-provider";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { CustomerNavbar } from "@/components/customer-navbar";
import { HomepageFooter } from "@/components/homepage-footer";
import { UIButton } from "@/components/ui-button";
import { UITextarea } from "@/components/ui-textarea";

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
        throw new Error("استجابة غير صالحة من خدمة چودي ستار");
      }

      if (!response.ok || envelope.success === false) {
        throw new Error(envelope.message || "تعذر إنشاء الطلب. حاول مرة أخرى.");
      }
      if (!Number.isSafeInteger(envelope.data?.id) || !envelope.data?.id) {
        throw new Error("لم يصل رقم الطلب من خدمة چودي ستار.");
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
    <>
      <CustomerNavbar />
      <main className="mx-auto min-h-[65vh] w-[min(1120px,calc(100%-32px))] pb-16 sm:w-[min(1120px,calc(100%-48px))] sm:pb-20">
        <Breadcrumbs
          items={[
            { label: "الرئيسية", href: "/" },
            { label: "السلة", href: "/cart" },
            { label: "إتمام الطلب" },
          ]}
        />

        <form
          className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_360px] lg:gap-8"
          onSubmit={submitOrder}
        >
          <div className="lg:col-span-2">
            <p className="text-xs font-extrabold text-now-600 sm:text-sm">
              الخطوة الأخيرة
            </p>
            <h1 className="mt-1 text-3xl font-black tracking-tight text-now-900 sm:text-4xl">
              إتمام الطلب
            </h1>
            <p className="mt-2 text-sm leading-6 text-now-900/55">
              راجع طلبك وأدخل عنوان التوصيل لتأكيده.
            </p>
          </div>

          {(error || cartError) && (
            <p
              className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-semibold leading-6 text-red-800 lg:col-span-2"
              role="alert"
            >
              {error || cartError}
            </p>
          )}

          {!ready ? (
            <div
              aria-label="جارٍ تحميل بيانات التوصيل"
              className="grid gap-4 lg:col-span-2 lg:grid-cols-[minmax(0,1fr)_360px]"
            >
              <div className="h-72 animate-pulse rounded-3xl bg-now-100" />
              <div className="h-64 animate-pulse rounded-3xl bg-now-100" />
            </div>
          ) : items.length === 0 ? (
            <section className="grid justify-items-center gap-3 rounded-3xl border border-now-900/[0.06] bg-white px-6 py-12 text-center shadow-sm lg:col-span-2">
              <h2 className="text-xl font-black text-now-900">سلتك فارغة</h2>
              <p className="text-sm text-now-900/55">
                أضف منتجات إلى السلة قبل إتمام الطلب.
              </p>
              <Link
                className="inline-flex min-h-12 items-center justify-center rounded-xl bg-now-600 px-6 font-extrabold text-white transition hover:bg-now-700"
                href="/#stores"
              >
                تصفح المتاجر
              </Link>
            </section>
          ) : (
            <>
              <div className="grid gap-5">
                <section
                  aria-labelledby="items-title"
                  className="rounded-3xl border border-now-900/[0.06] bg-white p-5 shadow-[0_10px_32px_rgba(24,51,45,0.06)] sm:p-6"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs font-extrabold text-now-600">
                        من متجر {items[0].storeName}
                      </p>
                      <h2
                        className="mt-1 text-lg font-black text-now-900 sm:text-xl"
                        id="items-title"
                      >
                        محتويات الطلب
                      </h2>
                    </div>
                    <span className="rounded-full bg-now-50 px-3 py-1 text-xs font-extrabold text-now-700">
                      {items.reduce((count, item) => count + item.quantity, 0)} قطعة
                    </span>
                  </div>
                  <div className="mt-5 grid gap-4">
                    {items.map((item) => {
                      const imageUrl = getSafeImageUrl(item.image);
                      return (
                        <article
                          className="grid grid-cols-[64px_minmax(0,1fr)] items-center gap-3 border-t border-now-900/[0.06] pt-4 sm:grid-cols-[72px_minmax(0,1fr)_auto] sm:gap-4"
                          key={item.productId}
                        >
                          <div className="relative size-16 overflow-hidden rounded-xl bg-now-50 sm:size-[72px]">
                            {imageUrl ? (
                              <Image
                                alt=""
                                className="object-cover"
                                fill
                                sizes="72px"
                                src={imageUrl}
                                unoptimized={shouldUnoptimizeImage(imageUrl)}
                              />
                            ) : (
                              <span className="absolute inset-0 grid place-items-center text-sm font-black text-now-600">
                                {item.name.slice(0, 1)}
                              </span>
                            )}
                          </div>
                          <div className="min-w-0">
                            <h3 className="truncate text-sm font-extrabold text-now-900 sm:text-base">
                              {item.name}
                            </h3>
                            <p className="mt-1 text-xs text-now-900/50">
                              {formatPrice(item.price)} × {item.quantity}
                            </p>
                          </div>
                          <strong className="col-start-2 text-sm font-black text-now-700 sm:col-start-auto">
                            {formatPrice(item.price * item.quantity)}
                          </strong>
                        </article>
                      );
                    })}
                  </div>
                </section>

                <section
                  aria-labelledby="address-title"
                  className="rounded-3xl border border-now-900/[0.06] bg-white p-5 shadow-[0_10px_32px_rgba(24,51,45,0.06)] sm:p-6"
                >
                  <div className="mb-5">
                    <p className="text-xs font-extrabold text-now-600">
                      أين نوصّل طلبك؟
                    </p>
                    <h2
                      className="mt-1 text-lg font-black text-now-900 sm:text-xl"
                      id="address-title"
                    >
                      عنوان التوصيل
                    </h2>
                  </div>
                  <UITextarea
                    autoComplete="street-address"
                    label="العنوان بالتفصيل"
                    maxLength={500}
                    minLength={5}
                    onChange={(event) =>
                      updateDelivery({ ...delivery, address: event.target.value })
                    }
                    placeholder="المنطقة، الشارع، رقم المبنى، وأي علامة مميزة"
                    required
                    rows={4}
                    value={delivery.address}
                  />
                  <div className="mt-4 flex flex-col gap-3 rounded-2xl bg-now-50 p-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-start gap-3">
                      <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-white text-now-600 shadow-sm">
                        <LocationIcon />
                      </span>
                      <div>
                        <p className="text-sm font-extrabold text-now-900">
                          موقع التوصيل
                        </p>
                        <p
                          className={`mt-1 text-xs leading-5 ${
                            locationSelected
                              ? "text-emerald-800"
                              : "text-now-900/55"
                          }`}
                          role="status"
                        >
                          {locationSelected
                            ? "تم تحديد الإحداثيات لهذا الطلب."
                            : "حدد موقعك على الخريطة لإتمام الطلب."}
                        </p>
                      </div>
                    </div>
                    <UIButton
                      className="w-full shrink-0 sm:w-auto"
                      disabled={locationBusy}
                      onClick={requestLocation}
                      type="button"
                      variant="outline"
                    >
                      {locationBusy
                        ? "جارٍ تحديد الموقع…"
                        : locationSelected
                          ? "تحديث موقعي"
                          : "تحديد موقعي"}
                    </UIButton>
                  </div>
                  <p className="mt-4 text-xs leading-6 text-now-900/50">
                    العنوان والإحداثيات محفوظة محليًا في هذا المتصفح وتُرسل مع
                    الطلب. لا يتوفر حاليًا API لحفظ دفتر عناوين العميل.
                  </p>
                </section>

                <section
                  aria-labelledby="payment-title"
                  className="rounded-3xl border border-now-900/[0.06] bg-white p-5 shadow-[0_10px_32px_rgba(24,51,45,0.06)] sm:p-6"
                >
                  <p className="text-xs font-extrabold text-now-600">
                    طريقة الدفع
                  </p>
                  <h2
                    className="mt-1 text-lg font-black text-now-900 sm:text-xl"
                    id="payment-title"
                  >
                    الدفع عند الاستلام
                  </h2>
                  <div className="mt-4 flex items-center gap-4 rounded-2xl border border-now-600/15 bg-now-50 p-4">
                    <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-white text-xl text-now-700 shadow-sm" aria-hidden="true">
                      ج
                    </span>
                    <div>
                      <p className="text-sm font-extrabold text-now-900">
                        نقدًا عند الاستلام
                      </p>
                      <p className="mt-1 text-xs leading-5 text-now-900/55">
                        طريقة الدفع المتاحة حاليًا.
                      </p>
                    </div>
                    <span className="mr-auto grid size-5 place-items-center rounded-full border-[6px] border-now-600 bg-white" aria-label="محدد" />
                  </div>
                </section>
              </div>

              <aside
                aria-label="ملخص الطلب"
                className="rounded-3xl border border-now-900/[0.06] bg-white p-5 shadow-[0_14px_36px_rgba(24,51,45,0.08)] sm:p-6 lg:sticky lg:top-24"
              >
                <div className="mb-5 flex items-center justify-between">
                  <h2 className="text-lg font-black text-now-900">ملخص الطلب</h2>
                  <span className="rounded-full bg-now-50 px-3 py-1 text-xs font-extrabold text-now-700">
                    {items.length} منتج
                  </span>
                </div>
                <div className="grid gap-4 border-b border-now-900/[0.07] pb-5 text-sm">
                  <div className="flex items-center justify-between gap-3 text-now-900/65">
                    <span>مجموع المنتجات التقديري</span>
                    <strong className="text-now-900">{formatPrice(subtotal)}</strong>
                  </div>
                  <div className="flex items-start justify-between gap-3 text-now-900/65">
                    <span>رسوم التوصيل</span>
                    <strong className="max-w-36 text-left text-xs font-bold leading-5 text-now-900/50">
                      يحددها النظام عند التأكيد
                    </strong>
                  </div>
                </div>
                <div className="flex items-center justify-between gap-3 py-5">
                  <span className="font-extrabold text-now-900">
                    الإجمالي التقديري
                  </span>
                  <strong className="text-xl font-black text-now-700">
                    {formatPrice(subtotal)}
                  </strong>
                </div>
                <p className="mb-5 text-xs leading-6 text-now-900/50">
                  يحسب الخادم السعر النهائي ورسوم التوصيل عند إنشاء الطلب.
                </p>
                <UIButton
                  className="min-h-14 w-full rounded-2xl text-base"
                  disabled={
                    !ready ||
                    submitting ||
                    items.length === 0 ||
                    !locationSelected
                  }
                  type="submit"
                >
                  {submitting ? "جارٍ تأكيد الطلب…" : "تأكيد الطلب"}
                </UIButton>
                {!locationSelected && (
                  <p className="mt-3 text-center text-xs leading-5 text-now-900/50">
                    حدد موقع التوصيل لتفعيل تأكيد الطلب.
                  </p>
                )}
                <Link
                  className="mt-3 inline-flex min-h-11 w-full items-center justify-center rounded-xl text-sm font-extrabold text-now-700 transition hover:bg-now-50"
                  href="/cart"
                >
                  الرجوع للسلة
                </Link>
              </aside>
            </>
          )}
        </form>
      </main>
      <HomepageFooter />
    </>
  );
}

function LocationIcon() {
  return (
    <svg aria-hidden="true" className="size-5" fill="none" viewBox="0 0 24 24">
      <path
        d="M19 10.2c0 5-7 10.3-7 10.3S5 15.2 5 10.2a7 7 0 1 1 14 0Z"
        stroke="currentColor"
        strokeWidth="1.8"
      />
      <circle cx="12" cy="10" r="2.2" stroke="currentColor" strokeWidth="1.8" />
    </svg>
  );
}

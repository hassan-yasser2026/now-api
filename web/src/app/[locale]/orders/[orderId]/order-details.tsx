"use client";

import { Link } from "@/i18n/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { HomepageFooter } from "@/components/homepage-footer";
import { UIButton } from "@/components/ui-button";
import { formatPrice } from "@/lib/api";

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

const TIMELINE = [
  ["receivedTitle", "receivedDescription"],
  ["confirmedTitle", "confirmedDescription"],
  ["preparingTitle", "preparingDescription"],
  ["onTheWayTitle", "onTheWayDescription"],
  ["deliveredTitle", "deliveredDescription"],
] as const;

const STATUS_MESSAGE_KEYS: Record<string, string> = {
  PENDING: "pending",
  ACCEPTED: "accepted",
  PREPARING: "preparing",
  READY: "ready",
  PICKED_UP: "pickedUp",
  ON_THE_WAY: "onTheWay",
  DELIVERED: "delivered",
  CANCELLED: "cancelled",
};

const STATUS_STEP: Record<string, number> = {
  PENDING: 0,
  ACCEPTED: 1,
  PREPARING: 2,
  READY: 2,
  PICKED_UP: 3,
  ON_THE_WAY: 3,
  DELIVERED: 4,
};

function formatDate(value: string | undefined, locale: string, unavailable: string) {
  if (!value) return unavailable;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return unavailable;
  return new Intl.DateTimeFormat(locale === "ar" ? "ar-EG" : "en", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function OrderTimeline({ status }: { status: string }) {
  const t = useTranslations("orderDetails");
  const statusT = useTranslations("status");
  const cancelled = status === "CANCELLED";
  const currentStep = STATUS_STEP[status] ?? 0;
  const steps = cancelled
    ? TIMELINE.slice(0, currentStep + 1)
    : TIMELINE;

  return (
    <section
      aria-label={t("timelineLabel")}
      className="rounded-3xl border border-now-900/[0.06] bg-white p-5 shadow-[0_10px_32px_rgba(24,51,45,0.06)] sm:p-7"
    >
      <div className="mb-6 flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-extrabold text-now-600">{t("follow")}</p>
          <h2 className="mt-1 text-lg font-black text-now-900 sm:text-xl">
            {t("status")}
          </h2>
        </div>
        <span
          className={`inline-flex min-h-10 items-center rounded-full px-3 text-center text-xs font-extrabold sm:px-4 sm:text-sm ${
            cancelled
              ? "bg-red-50 text-red-800"
              : status === "DELIVERED"
                ? "bg-emerald-50 text-emerald-800"
                : "bg-now-50 text-now-700"
          }`}
        >
          {STATUS_MESSAGE_KEYS[status]
            ? statusT(STATUS_MESSAGE_KEYS[status])
            : status.replaceAll("_", " ")}
        </span>
      </div>

      {cancelled ? (
        <div className="rounded-2xl border border-red-100 bg-red-50 p-4 text-sm leading-7 text-red-900">
          {t("cancelledMessage")}
        </div>
      ) : (
        <ol className="grid gap-0 sm:grid-cols-5 sm:gap-3">
          {steps.map((step, index) => {
            const complete = index < currentStep || status === "DELIVERED";
            const current = index === currentStep && status !== "DELIVERED";
            return (
              <li
                aria-current={current ? "step" : undefined}
                className="relative grid grid-cols-[40px_minmax(0,1fr)] gap-x-3 pb-5 last:pb-0 sm:grid-cols-1 sm:gap-3 sm:pb-0"
                key={step[0]}
              >
                {index < steps.length - 1 && (
                  <span
                    aria-hidden="true"
                    className={`absolute right-[19px] top-10 h-[calc(100%-30px)] w-0.5 sm:right-5 sm:top-5 sm:h-0.5 sm:w-[calc(100%+12px)] ${
                      complete ? "bg-now-500" : "bg-now-900/10"
                    }`}
                  />
                )}
                <span
                  className={`relative z-10 grid size-10 place-items-center rounded-full border-2 text-sm font-black ${
                    complete
                      ? "border-now-600 bg-now-600 text-white"
                      : current
                        ? "border-now-600 bg-white text-now-700 ring-4 ring-now-100"
                        : "border-now-900/10 bg-now-cream text-now-900/35"
                  }`}
                >
                  {complete ? "✓" : index + 1}
                </span>
                <span className="min-w-0 pt-0.5 sm:pt-0">
                  <span
                    className={`block text-sm font-extrabold ${
                      complete || current ? "text-now-900" : "text-now-900/40"
                    }`}
                  >
                    {t(step[0])}
                  </span>
                  <span className="mt-1 block text-xs leading-5 text-now-900/45">
                    {t(step[1])}
                  </span>
                </span>
              </li>
            );
          })}
        </ol>
      )}
      <p className="mt-5 border-t border-now-900/[0.06] pt-4 text-xs leading-6 text-now-900/45">
        {status === "DELIVERED"
          ? t("deliveredNote")
          : cancelled
            ? t("cancelledNote")
            : t("timelineNote")}
      </p>
    </section>
  );
}

export function OrderDetails({ orderId }: { orderId: number }) {
  const locale = useLocale();
  const t = useTranslations("orderDetails");
  const statusT = useTranslations("status");
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
        throw new Error(t("invalidResponse"));
      }
      if (!response.ok || envelope.success === false) {
        throw new Error(envelope.message || t("loadFailed"));
      }
      const data = envelope.data;
      if (
        !data ||
        data.id !== orderId ||
        typeof data.status !== "string" ||
        !Array.isArray(data.items)
      ) {
        throw new Error(t("incomplete"));
      }
      setOrder(data);
      setError("");
      setLastUpdated(new Date().toISOString());
    } catch (loadError) {
      console.error("Could not refresh customer order:", loadError);
      setError(
        loadError instanceof Error
          ? loadError.message
          : t("refreshFailed"),
      );
    } finally {
      setLoading(false);
      inFlight.current = false;
    }
  }, [orderId, t]);

  useEffect(() => {
    const initialRefresh = window.setTimeout(() => void refresh(), 0);
    const interval = window.setInterval(() => void refresh(), 30_000);
    return () => {
      window.clearTimeout(initialRefresh);
      window.clearInterval(interval);
    };
  }, [refresh]);

  return (
    <>
      <main className="mx-auto min-h-[65vh] w-[min(1120px,calc(100%-32px))] pb-16 sm:w-[min(1120px,calc(100%-48px))] sm:pb-20">
      <Breadcrumbs
        items={[
          { label: t("home"), href: "/" },
          { label: t("orders"), href: "/orders" },
          { label: t("orderNumber", { id: orderId }) },
        ]}
      />
      <div className="mb-6 sm:mb-8">
        <p className="text-xs font-extrabold text-now-600 sm:text-sm">
          {t("followOrder")}
        </p>
        <h1 className="mt-1 text-3xl font-black tracking-tight text-now-900 sm:text-4xl">
          {t("orderNumber", { id: orderId })}
        </h1>
      </div>

      {loading && !order ? (
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_360px]">
          <div className="grid gap-5">
            <div className="h-64 animate-pulse rounded-3xl bg-now-100" />
            <div className="h-56 animate-pulse rounded-3xl bg-now-100" />
          </div>
          <div className="h-72 animate-pulse rounded-3xl bg-now-100" />
        </div>
      ) : error && !order ? (
        <section
          className="mx-auto grid max-w-2xl justify-items-center rounded-3xl border border-red-200 bg-white px-6 py-12 text-center shadow-sm sm:py-16"
          role="alert"
        >
          <span className="grid size-14 place-items-center rounded-2xl bg-red-50 text-2xl font-black text-red-700">
            !
          </span>
          <h2 className="mt-4 text-xl font-black text-now-900">
            {t("loadTitle")}
          </h2>
          <p className="mt-2 text-sm leading-7 text-now-900/60">{error}</p>
          <div className="mt-5 flex flex-wrap justify-center gap-3">
            <UIButton onClick={() => void refresh()} type="button">
              {t("retry")}
            </UIButton>
            <Link
              className="inline-flex min-h-12 items-center justify-center rounded-xl border border-now-600/25 bg-white px-5 text-sm font-extrabold text-now-700 transition hover:bg-now-50"
              href="/orders"
            >
              {t("allOrders")}
            </Link>
          </div>
        </section>
      ) : order ? (
        <>
          {error && (
            <p
              className="mb-5 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-900"
              role="status"
            >
              {t("refreshNotice")}
            </p>
          )}
          <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_360px] lg:gap-7">
            <div className="grid gap-5">
              <section className="flex flex-col gap-4 rounded-3xl border border-now-900/[0.06] bg-white p-5 shadow-[0_10px_32px_rgba(24,51,45,0.06)] sm:flex-row sm:items-center sm:justify-between sm:p-6">
                <div>
                  <p className="text-xs font-extrabold text-now-600">
                    {order.store?.name || t("storeFallback")}
                  </p>
                  <h2 className="mt-1 text-xl font-black text-now-900">
                    {t("details")}
                  </h2>
                  <p className="mt-2 text-xs text-now-900/50 sm:text-sm">
                    {t("createdAt", {
                      date: formatDate(order.createdAt, locale, t("unavailable")),
                    })}
                  </p>
                </div>
                <div className="inline-flex min-h-11 items-center gap-2 self-start rounded-xl bg-now-50 px-4 text-sm font-extrabold text-now-700 sm:self-center">
                  <span className="size-2 rounded-full bg-now-500" />
                  {STATUS_MESSAGE_KEYS[order.status]
                    ? statusT(STATUS_MESSAGE_KEYS[order.status])
                    : order.status.replaceAll("_", " ")}
                </div>
              </section>

              <OrderTimeline status={order.status} />

              <section className="rounded-3xl border border-now-900/[0.06] bg-white p-5 shadow-[0_10px_32px_rgba(24,51,45,0.06)] sm:p-6">
                <div className="mb-4">
                  <p className="text-xs font-extrabold text-now-600">
                    {t("yourOrderFrom", {
                      store: order.store?.name || t("storeFallback"),
                    })}
                  </p>
                  <h2 className="mt-1 text-lg font-black text-now-900 sm:text-xl">
                    {t("products")}
                  </h2>
                </div>
                <ul className="grid gap-0">
                  {order.items.map((item, index) => (
                    <li
                      className="flex items-start justify-between gap-4 border-t border-now-900/[0.06] py-4 first:border-0 first:pt-0 last:pb-0"
                      key={item.id || `${orderId}-${index}`}
                    >
                      <span className="min-w-0 text-sm font-bold leading-6 text-now-900">
                        {(locale === "en"
                          ? item.menuItem?.name || item.menuItem?.nameAr
                          : item.menuItem?.nameAr || item.menuItem?.name) ||
                          t("productFallback")}
                        <span className="ms-1 text-now-900/50">
                          × {item.quantity}
                        </span>
                      </span>
                      {item.priceAtOrder !== undefined && (
                        <strong className="shrink-0 text-sm font-extrabold text-now-700">
                          {formatPrice(
                            Number(item.priceAtOrder) * Number(item.quantity),
                            locale,
                          )}
                        </strong>
                      )}
                    </li>
                  ))}
                  {order.items.length === 0 && (
                    <li className="text-sm text-now-900/50">
                      {t("productsUnavailable")}
                    </li>
                  )}
                </ul>
              </section>

              <section className="rounded-3xl border border-now-900/[0.06] bg-white p-5 shadow-[0_10px_32px_rgba(24,51,45,0.06)] sm:p-6">
                <p className="text-xs font-extrabold text-now-600">
                  {t("delivery")}
                </p>
                <h2 className="mt-1 text-lg font-black text-now-900 sm:text-xl">
                  {t("address")}
                </h2>
                <p className="mt-3 rounded-2xl bg-now-cream p-4 text-sm leading-7 text-now-900/70">
                  {order.address || t("addressUnavailable")}
                </p>
              </section>
            </div>

            <aside className="rounded-3xl border border-now-900/[0.06] bg-white p-5 shadow-[0_14px_36px_rgba(24,51,45,0.08)] sm:p-6 lg:sticky lg:top-24">
              <div className="mb-5 flex items-center justify-between gap-3">
                <h2 className="text-lg font-black text-now-900">
                  {t("amountSummary")}
                </h2>
                <span className="rounded-full bg-now-50 px-3 py-1 text-xs font-extrabold text-now-700">
                  #{order.id}
                </span>
              </div>
              <div className="grid gap-4 border-b border-now-900/[0.07] pb-5 text-sm">
                {order.subtotal !== undefined && (
                  <MoneyRow
                    label={t("subtotal")}
                    value={formatPrice(order.subtotal, locale)}
                  />
                )}
                {order.deliveryFee !== undefined && (
                  <MoneyRow
                    label={t("deliveryFee")}
                    value={formatPrice(order.deliveryFee, locale)}
                  />
                )}
                {order.platformCommission !== undefined && (
                  <MoneyRow
                    label={t("serviceFee")}
                    value={formatPrice(order.platformCommission, locale)}
                  />
                )}
              </div>
              <div className="flex items-center justify-between gap-3 py-5">
                <span className="font-extrabold text-now-900">{t("total")}</span>
                <strong className="text-xl font-black text-now-700">
                  {formatPrice(order.totalPrice, locale)}
                </strong>
              </div>
              <p className="text-xs leading-6 text-now-900/45">
                {t("amountNote")}
              </p>
              <div className="mt-5 border-t border-now-900/[0.07] pt-4">
                <p className="text-xs text-now-900/45">{t("lastUpdated")}</p>
                <p className="mt-1 text-sm font-bold text-now-900">
                  {lastUpdated
                    ? formatDate(lastUpdated, locale, t("unavailable"))
                    : t("refreshing")}
                </p>
                <p className="mt-2 text-xs text-now-900/45">
                  {t("autoRefresh")}
                </p>
              </div>
              <UIButton
                className="mt-4 w-full"
                disabled={loading}
                onClick={() => void refresh()}
                type="button"
                variant="outline"
              >
                {loading ? t("refreshing") : t("refreshNow")}
              </UIButton>
              <Link
                className="mt-2 inline-flex min-h-11 w-full items-center justify-center rounded-xl text-sm font-extrabold text-now-700 transition hover:bg-now-50"
                href="/orders"
              >
                {t("backToOrders")}
              </Link>
            </aside>
          </div>
        </>
      ) : null}
      </main>
      <HomepageFooter />
    </>
  );
}

function MoneyRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 text-now-900/60">
      <span>{label}</span>
      <strong className="shrink-0 font-bold text-now-900">{value}</strong>
    </div>
  );
}

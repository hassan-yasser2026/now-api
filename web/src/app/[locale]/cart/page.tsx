"use client";

import Image from "next/image";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Breadcrumbs } from "@/components/breadcrumbs";
import {
  CartItem,
  getCartItemName,
  useCart,
} from "@/components/cart-provider";
import { CustomerNavbar } from "@/components/customer-navbar";
import { HomepageFooter } from "@/components/homepage-footer";
import {
  formatPrice,
  getSafeImageUrl,
  shouldUnoptimizeImage,
} from "@/lib/api";

function CartLine({
  item,
  setQuantity,
  removeItem,
}: {
  item: CartItem;
  setQuantity: (productId: number, quantity: number) => void;
  removeItem: (productId: number) => void;
}) {
  const t = useTranslations("cart");
  const locale = useLocale();
  const imageUrl = getSafeImageUrl(item.image);
  const name = getCartItemName(item, locale);

  return (
    <article className="grid gap-4 rounded-3xl border border-now-900/[0.06] bg-white p-4 shadow-[0_8px_26px_rgba(24,51,45,0.05)] transition hover:shadow-[0_14px_36px_rgba(24,51,45,0.09)] sm:grid-cols-[96px_minmax(0,1fr)_auto] sm:items-center sm:gap-5 sm:p-5">
      <div className="relative size-20 overflow-hidden rounded-2xl bg-gradient-to-br from-now-100 to-emerald-50 sm:size-24">
        {imageUrl ? (
          <Image
            alt=""
            className="object-cover"
            fill
            sizes="96px"
            src={imageUrl}
            unoptimized={shouldUnoptimizeImage(imageUrl)}
          />
        ) : (
          <span className="absolute inset-0 grid place-items-center text-2xl font-black text-now-600">
            {name.slice(0, 1)}
          </span>
        )}
      </div>

      <div className="min-w-0">
        <h2 className="truncate text-base font-extrabold text-now-900 sm:text-lg">
          {name}
        </h2>
        <p className="mt-1 text-sm text-now-900/55">
          {formatPrice(item.price, locale)} <span aria-hidden="true">·</span>{" "}
          <span className="font-semibold">{t("perItem")}</span>
        </p>
        <div className="mt-4 inline-flex min-h-11 items-center gap-1 rounded-xl border border-now-900/10 bg-now-cream p-1">
          <button
            aria-label={t("decreaseQuantity", { name })}
            className="grid size-11 place-items-center rounded-lg text-xl font-bold text-now-700 transition hover:bg-now-100 disabled:opacity-45"
            disabled={item.quantity <= 1}
            onClick={() => setQuantity(item.productId, item.quantity - 1)}
            type="button"
          >
            −
          </button>
          <span aria-live="polite" className="min-w-8 text-center text-sm font-black text-now-900">
            {item.quantity}
          </span>
          <button
            aria-label={t("increaseQuantity", { name })}
            className="grid size-11 place-items-center rounded-lg text-xl font-bold text-now-700 transition hover:bg-now-100"
            disabled={item.quantity >= 99}
            onClick={() => setQuantity(item.productId, item.quantity + 1)}
            type="button"
          >
            +
          </button>
        </div>
      </div>

      <div className="flex items-center justify-between gap-3 border-t border-now-900/[0.06] pt-3 sm:grid sm:justify-items-end sm:border-0 sm:pt-0">
        <strong className="text-base font-black text-now-700">
          {formatPrice(item.price * item.quantity, locale)}
        </strong>
        <button
          className="inline-flex min-h-11 items-center rounded-xl px-3 text-sm font-bold text-red-700 transition hover:bg-red-50"
          onClick={() => removeItem(item.productId)}
          type="button"
        >
          {t("remove")}
        </button>
      </div>
    </article>
  );
}

export default function CartPage() {
  const t = useTranslations("cart");
  const locale = useLocale();
  const common = useTranslations("common");
  const { items, error, setQuantity, removeItem, clearCart } = useCart();
  const total = items.reduce((sum, item) => sum + item.price * item.quantity, 0);

  return (
    <>
      <CustomerNavbar />
      <main className="mx-auto min-h-[65vh] w-[min(1120px,calc(100%-32px))] pb-16 sm:w-[min(1120px,calc(100%-48px))] sm:pb-20">
        <Breadcrumbs items={[{ label: t("home"), href: "/" }, { label: t("title") }]} />

        <div className="mb-6 flex flex-col gap-4 sm:mb-8 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-extrabold text-now-600 sm:text-sm">{t("tagline")}</p>
            <h1 className="mt-1 text-3xl font-black tracking-tight text-now-900 sm:text-4xl">
              {t("title")}
            </h1>
            {items.length > 0 && (
              <p className="mt-2 text-sm text-now-900/50">
                {t("itemCount", {
                  count: items.reduce((sum, item) => sum + item.quantity, 0),
                  store: items[0].storeName,
                })}
              </p>
            )}
          </div>
          {items.length > 0 && (
            <button
              className="inline-flex min-h-11 w-fit items-center rounded-xl px-4 text-sm font-extrabold text-red-700 transition hover:bg-red-50"
              onClick={clearCart}
              type="button"
            >
              {t("clear")}
            </button>
          )}
        </div>

        {error && (
          <p className="mb-5 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-semibold leading-6 text-red-800" role="alert">
            {error}
          </p>
        )}

        {items.length === 0 ? (
          <section className="grid min-h-[320px] content-center justify-items-center rounded-3xl border border-now-900/[0.06] bg-white px-6 py-12 text-center shadow-[0_12px_36px_rgba(24,51,45,0.06)]">
            <span className="grid size-16 place-items-center rounded-2xl bg-now-50 text-3xl text-now-600" aria-hidden="true">
              ♧
            </span>
            <h2 className="mt-5 text-xl font-black text-now-900 sm:text-2xl">
              {t("emptyTitle")}
            </h2>
            <p className="mt-2 max-w-sm text-sm leading-7 text-now-900/55">
              {t("emptyDescription")}
            </p>
            <Link
              className="mt-6 inline-flex min-h-12 items-center justify-center rounded-xl bg-now-600 px-6 text-sm font-extrabold text-white shadow-md shadow-now-600/20 transition hover:-translate-y-0.5 hover:bg-now-700"
              href="/#stores"
            >
              {common("browseStores")}
            </Link>
          </section>
        ) : (
          <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_360px] lg:gap-8">
            <section aria-label={t("itemsLabel")} className="grid gap-3 sm:gap-4">
              <div className="flex items-center justify-between rounded-2xl bg-now-50 px-4 py-3 text-sm">
                <span className="font-bold text-now-900/60">{t("store")}</span>
                <span className="font-extrabold text-now-700">{items[0].storeName}</span>
              </div>
              {items.map((item) => (
                <CartLine
                  item={item}
                  key={item.productId}
                  removeItem={removeItem}
                  setQuantity={setQuantity}
                />
              ))}
            </section>

            <aside className="rounded-3xl border border-now-900/[0.06] bg-white p-5 shadow-[0_14px_36px_rgba(24,51,45,0.08)] sm:p-6 lg:sticky lg:top-24">
              <div className="mb-5 flex items-center justify-between">
                <h2 className="text-lg font-black text-now-900">{t("summary")}</h2>
                <span className="rounded-full bg-now-50 px-3 py-1 text-xs font-extrabold text-now-700">
                  {t("quantity", {
                    count: items.reduce((sum, item) => sum + item.quantity, 0),
                  })}
                </span>
              </div>
              <div className="grid gap-4 border-b border-now-900/[0.07] pb-5 text-sm">
                <div className="flex items-center justify-between gap-3 text-now-900/65">
                  <span>{t("subtotal")}</span>
                  <strong className="text-now-900">{formatPrice(total, locale)}</strong>
                </div>
                <div className="flex items-start justify-between gap-3 text-now-900/65">
                  <span>{t("deliveryFee")}</span>
                  <strong className="text-left text-xs font-bold text-now-900/50">
                    {t("feeAtCheckout")}
                  </strong>
                </div>
              </div>
              <div className="flex items-center justify-between gap-3 py-5">
                <span className="font-extrabold text-now-900">{t("estimate")}</span>
                <strong className="text-xl font-black text-now-700">
                  {formatPrice(total, locale)}
                </strong>
              </div>
              <p className="mb-5 text-xs leading-6 text-now-900/50">
                {t("estimateNote")}
              </p>
              <Link
                className="inline-flex min-h-14 w-full items-center justify-center gap-2 rounded-2xl bg-now-600 px-5 text-base font-black text-white shadow-lg shadow-now-600/20 transition duration-200 hover:-translate-y-0.5 hover:bg-now-700 hover:shadow-xl"
                href="/checkout"
              >
                {t("checkout")} <span aria-hidden="true">←</span>
              </Link>
              <Link
                className="mt-3 inline-flex min-h-11 w-full items-center justify-center rounded-xl text-sm font-extrabold text-now-700 transition hover:bg-now-50"
                href="/#stores"
              >
                {t("continueShopping")}
              </Link>
            </aside>
          </div>
        )}
      </main>
      <HomepageFooter />
    </>
  );
}

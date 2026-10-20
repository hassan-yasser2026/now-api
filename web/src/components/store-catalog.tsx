"use client";

import { Link } from "@/i18n/navigation";
import { useLocale, useTranslations } from "next-intl";
import { useMemo, useState } from "react";
import { formatPrice, type MenuItem } from "@/lib/api";
import { useCart } from "./cart-provider";
import { CustomerProductImage } from "./customer-product-image";
import { ProductFavoriteButton } from "./product-favorite-button";
import { useToast } from "./toast-provider";

function getProductCategoryName(product: MenuItem, locale: string) {
  return locale === "en"
    ? product.category?.name || product.category?.nameAr || ""
    : product.category?.nameAr || product.category?.name || "";
}

function StoreMenuItem({
  storeId,
  storeName,
  product,
}: {
  storeId: number;
  storeName: string;
  product: MenuItem;
}) {
  const locale = useLocale();
  const t = useTranslations("product");
  const cartT = useTranslations("cart");
  const toastT = useTranslations("toast");
  const { items, isInitialized: cartInitialized, addItem, setQuantity } = useCart();
  const { showToast } = useToast();
  const quantity =
    items.find(
      (item) =>
        item.storeId === storeId && item.productId === product.id,
    )?.quantity || 0;
  const name = locale === "en" ? product.name : product.nameAr || product.name;
  const available = product.isAvailable;
  const direction = "flex-row";

  function add() {
    const result = addItem({ id: storeId, name: storeName }, product);
    if (result === "added") {
      showToast(toastT("addedToCart"), "success");
    } else if (result === "different-store") {
      showToast(toastT("otherStoreCart"), "error");
    } else {
      showToast(toastT("invalidProduct"), "error");
    }
  }

  return (
    <article
      dir={locale === "ar" ? "rtl" : "ltr"}
      className={`flex ${direction} items-center gap-2.5 rounded-[18px] border border-[#e0e0e0] bg-white p-2.5 shadow-[0_2px_10px_rgba(18,107,87,0.06)] sm:gap-3 sm:p-3 ${
        available ? "" : "opacity-60"
      }`}
    >
      {available ? (
        <Link
          className={`flex min-w-0 flex-1 ${direction} items-center gap-3`}
          href={`/stores/${storeId}/products/${product.id}`}
        >
          <div className="w-[112px] shrink-0 overflow-hidden rounded-[14px] sm:w-[120px]">
            <CustomerProductImage product={product} variant="menu" />
          </div>
          <div className={`min-w-0 flex-1 ${locale === "ar" ? "text-right" : "text-left"}`}>
            <h3 className="line-clamp-2 text-sm font-extrabold text-now-900 sm:text-base">
              {name}
            </h3>
            {product.description && (
              <p className="mt-1 line-clamp-2 text-xs leading-5 text-now-700">
                {product.description}
              </p>
            )}
            <span className="mt-2 inline-flex items-center gap-1.5 text-[11px] font-bold text-emerald-700">
              <span className="size-1.5 rounded-full bg-emerald-500" />
              {t("available")}
            </span>
          </div>
        </Link>
      ) : (
        <div className={`flex min-w-0 flex-1 ${direction} items-center gap-3`}>
          <div className="w-[112px] shrink-0 overflow-hidden rounded-[14px] sm:w-[120px]">
            <CustomerProductImage product={product} variant="menu" />
          </div>
          <div className={`min-w-0 flex-1 ${locale === "ar" ? "text-right" : "text-left"}`}>
            <h3 className="line-clamp-2 text-sm font-extrabold text-now-900 sm:text-base">
              {name}
            </h3>
            {product.description && (
              <p className="mt-1 line-clamp-2 text-xs leading-5 text-now-700">
                {product.description}
              </p>
            )}
            <span className="mt-2 inline-flex items-center gap-1.5 text-[11px] font-bold text-now-700">
              {t("unavailable")}
            </span>
          </div>
        </div>
      )}

      <ProductFavoriteButton
        productId={product.id}
        storeId={storeId}
      />

      {available ? (
        quantity > 0 ? (
          <div className="flex shrink-0 items-center gap-1.5">
            <button
              aria-label={cartT("decreaseQuantity", { name })}
              className="grid size-8 place-items-center rounded-xl border border-now-600/30 text-lg font-bold text-now-600 transition hover:bg-now-50 disabled:opacity-50"
              disabled={!cartInitialized}
              onClick={() => setQuantity(product.id, quantity - 1)}
              type="button"
            >
              −
            </button>
            <span className="min-w-5 text-center text-sm font-bold text-now-900">
              {quantity}
            </span>
            <button
              aria-label={cartT("increaseQuantity", { name })}
              className="grid size-8 place-items-center rounded-xl border border-now-600/30 text-lg font-bold text-now-600 transition hover:bg-now-50 disabled:opacity-50"
              disabled={!cartInitialized}
              onClick={add}
              type="button"
            >
              +
            </button>
          </div>
        ) : (
          <button
            aria-label={cartT("increaseQuantity", { name })}
            className="grid size-10 shrink-0 place-items-center rounded-2xl bg-[#fff1f7] text-2xl font-medium text-now-600 transition hover:bg-now-100 disabled:opacity-50"
            onClick={add}
            disabled={!cartInitialized}
            type="button"
          >
            +
          </button>
        )
      ) : (
        <span className="shrink-0 rounded-lg bg-now-50 px-2 py-1 text-[10px] font-bold text-now-700">
          {t("unavailable")}
        </span>
      )}
    </article>
  );
}

export function StoreCatalog({
  storeId,
  storeName,
  products,
}: {
  storeId: number;
  storeName: string;
  products: MenuItem[];
}) {
  const t = useTranslations("product");
  const cartT = useTranslations("cart");
  const locale = useLocale();
  const [activeCategory, setActiveCategory] = useState("");
  const { items } = useCart();
  const storeCartItems = items.filter((item) => item.storeId === storeId);
  const cartQuantity = storeCartItems.reduce(
    (total, item) => total + item.quantity,
    0,
  );
  const cartTotal = storeCartItems.reduce(
    (total, item) => total + item.price * item.quantity,
    0,
  );
  const categories = useMemo(
    () => [
      ...new Set(
        products
          .map((product) => getProductCategoryName(product, locale))
          .filter(Boolean),
      ),
    ],
    [locale, products],
  );
  const filteredProducts = activeCategory
    ? products.filter(
        (product) =>
          getProductCategoryName(product, locale) === activeCategory,
      )
    : products;

  return (
    <>
      {categories.length > 0 && (
        <div className="mb-5 flex gap-2 overflow-x-auto pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {[t("allCategories"), ...categories].map((category) => {
            const selected =
              category === t("allCategories")
                ? !activeCategory
                : category === activeCategory;
            return (
              <button
                aria-pressed={selected}
                className={`min-h-10 shrink-0 rounded-full border px-4 text-xs font-extrabold transition sm:min-h-11 sm:px-5 sm:text-sm ${
                  selected
                    ? "border-now-600 bg-now-600 text-white shadow-md shadow-now-600/20"
                    : "border-now-900/10 bg-white text-now-900/65 hover:border-now-600/30 hover:bg-now-50 hover:text-now-700"
                }`}
                key={category}
                onClick={() =>
                  setActiveCategory(
                    category === t("allCategories") ? "" : category,
                  )
                }
                type="button"
              >
                {category}
              </button>
            );
          })}
        </div>
      )}
      {filteredProducts.length > 0 ? (
        <div className="grid grid-cols-1 gap-2.5 sm:gap-3">
          {filteredProducts.map((product) => (
            <StoreMenuItem
              key={product.id}
              product={product}
              storeId={storeId}
              storeName={storeName}
            />
          ))}
        </div>
      ) : (
        <div className="rounded-3xl border border-now-900/[0.06] bg-white px-6 py-12 text-center shadow-sm sm:py-16">
          <span className="mx-auto grid size-14 place-items-center rounded-2xl bg-now-50 text-2xl text-now-600">⌕</span>
          <h3 className="mt-4 text-lg font-black text-now-900">
            {products.length > 0
              ? t("emptyCategory")
              : t("emptyProducts")}
          </h3>
          <p className="mt-2 text-sm leading-6 text-now-900/55">
            {products.length > 0
              ? t("chooseAnotherCategory")
              : t("emptyStore")}
          </p>
        </div>
      )}
      {cartQuantity > 0 && (
        <Link
          className="fixed inset-x-3 bottom-3 z-40 mx-auto flex min-h-[68px] max-w-[520px] items-center justify-between gap-3 rounded-2xl bg-now-600 px-4 py-3 text-white shadow-[0_12px_32px_rgba(24,51,45,0.28)] transition hover:bg-now-700 sm:bottom-5 sm:px-5"
          href="/cart"
        >
          <span className="grid size-8 shrink-0 place-items-center rounded-full bg-white text-sm font-black text-now-700">
            {cartQuantity}
          </span>
          <span className="min-w-0 flex-1 truncate text-xs font-bold sm:text-sm">
            {cartT("itemCount", {
              count: cartQuantity,
              store: storeName,
            })}
          </span>
          <span className="shrink-0 text-sm font-black">
            {formatPrice(cartTotal, locale)}
          </span>
          <span className="shrink-0 rounded-xl bg-now-gold px-3 py-2 text-xs font-black text-now-900 sm:px-4 sm:text-sm">
            {cartT("checkout")}
          </span>
        </Link>
      )}
    </>
  );
}

"use client";

import Image from "next/image";
import { Link } from "@/i18n/navigation";
import { useLocale, useTranslations } from "next-intl";
import { useMemo, useState } from "react";
import {
  formatPrice,
  getSafeImageUrl,
  shouldUnoptimizeImage,
  type MenuItem,
} from "@/lib/api";

function ProductTile({
  storeId,
  product,
  isFirstProduct,
}: {
  storeId: number;
  product: MenuItem;
  isFirstProduct: boolean;
}) {
  const t = useTranslations("product");
  const locale = useLocale();
  const imageUrl = getSafeImageUrl(product.image);
  const name =
    locale === "en" ? product.name : product.nameAr || product.name;
  const category =
    locale === "en"
      ? product.category?.name || product.category?.nameAr
      : product.category?.nameAr || product.category?.name;

  return (
    <Link
      className="group overflow-hidden rounded-3xl border border-now-900/[0.06] bg-white shadow-[0_8px_26px_rgba(24,51,45,0.05)] transition duration-300 hover:-translate-y-1 hover:border-now-600/20 hover:shadow-[0_18px_40px_rgba(24,51,45,0.12)] focus-visible:outline-3 focus-visible:outline-offset-4 focus-visible:outline-now-500"
      href={`/stores/${storeId}/products/${product.id}`}
    >
      <div className="relative aspect-[1.2] overflow-hidden bg-gradient-to-br from-now-100 to-emerald-50">
        {imageUrl ? (
          <Image
            alt={name}
            className="object-cover transition duration-500 group-hover:scale-105"
            fetchPriority={isFirstProduct ? "high" : "auto"}
            fill
            preload={isFirstProduct}
            sizes="(max-width: 639px) 100vw, (max-width: 1023px) 50vw, 33vw"
            src={imageUrl}
            unoptimized={shouldUnoptimizeImage(imageUrl)}
          />
        ) : (
          <div className="absolute inset-0 grid place-items-center bg-[radial-gradient(circle_at_30%_25%,rgba(255,255,255,.8),transparent_45%),linear-gradient(135deg,#ddf3e8,#c1e5d4)] text-5xl font-black text-now-600/80">
            {name.slice(0, 1)}
          </div>
        )}
        {category && (
          <span className="absolute right-3 top-3 max-w-[calc(100%-24px)] truncate rounded-full border border-white/70 bg-white/95 px-3 py-1.5 text-xs font-extrabold text-now-700 shadow-sm">
            {category}
          </span>
        )}
        {Number(product.discountPercentage) > 0 && (
          <span className="absolute left-3 top-3 rounded-full bg-now-gold px-3 py-1.5 text-xs font-black text-now-900 shadow-sm">
            {t("discount", { percentage: Number(product.discountPercentage) })}
          </span>
        )}
      </div>
      <div className="p-4 sm:p-5">
        <h3 className="truncate text-base font-extrabold text-now-900 transition-colors group-hover:text-now-600 sm:text-lg">
          {name}
        </h3>
        <p className="mt-2 line-clamp-2 min-h-10 text-xs leading-5 text-now-700 sm:text-sm sm:leading-6">
          {product.description || t("fallbackDescription")}
        </p>
        <div className="mt-4 flex items-center justify-between gap-2 border-t border-now-900/[0.06] pt-3">
          <div className="flex min-w-0 flex-wrap items-baseline gap-x-2">
            <span className="text-sm font-black text-now-700 sm:text-base">
              {formatPrice(product.price, locale)}
            </span>
            {Number(product.originalPrice) > Number(product.price) && (
              <span className="text-xs text-now-700 line-through">
                {formatPrice(product.originalPrice || product.price, locale)}
              </span>
            )}
          </div>
          <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-now-50 text-xl font-bold text-now-700 transition group-hover:bg-now-600 group-hover:text-white">
            +
          </span>
        </div>
      </div>
    </Link>
  );
}

export function StoreCatalog({
  storeId,
  products,
}: {
  storeId: number;
  products: MenuItem[];
}) {
  const t = useTranslations("product");
  const [activeCategory, setActiveCategory] = useState("");
  const categories = useMemo(
    () =>
      [...new Set(
        products
          .map((product) => product.category?.nameAr || product.category?.name || "")
          .filter(Boolean),
      )],
    [products],
  );
  const filteredProducts = activeCategory
    ? products.filter(
        (product) =>
          (product.category?.nameAr || product.category?.name || "") ===
          activeCategory,
      )
    : products;

  return (
    <>
      {categories.length > 0 && (
        <div className="mb-6 flex gap-2 overflow-x-auto pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {[t("allCategories"), ...categories].map((category) => {
            const selected =
              category === t("allCategories")
                ? !activeCategory
                : category === activeCategory;
            return (
              <button
                aria-pressed={selected}
                className={`min-h-11 shrink-0 rounded-full border px-5 text-sm font-extrabold transition ${
                  selected
                    ? "border-now-600 bg-now-600 text-white shadow-md shadow-now-600/20"
                    : "border-now-900/10 bg-white text-now-900/65 hover:border-now-600/30 hover:bg-now-50 hover:text-now-700"
                }`}
                key={category}
                onClick={() =>
                  setActiveCategory(category === t("allCategories") ? "" : category)
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
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5 xl:grid-cols-3">
          {filteredProducts.map((product, index) => (
            <ProductTile
              isFirstProduct={index === 0}
              key={product.id}
              product={product}
              storeId={storeId}
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
    </>
  );
}

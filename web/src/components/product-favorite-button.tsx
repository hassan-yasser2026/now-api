"use client";

import { useTranslations } from "next-intl";
import { useProductFavorites } from "./product-favorites-provider";

export function ProductFavoriteButton({
  storeId,
  productId,
  className = "",
}: {
  storeId: number;
  productId: number;
  className?: string;
}) {
  const t = useTranslations("discovery");
  const { favoriteProductKeys, isInitialized, toggleFavorite } =
    useProductFavorites();
  const isFavorite = favoriteProductKeys.includes(`${storeId}:${productId}`);

  return (
    <button
      aria-label={isFavorite ? t("removeProductFavorite") : t("saveProductFavorite")}
      aria-pressed={isFavorite}
      className={`grid size-10 place-items-center rounded-full border border-white/80 shadow-md transition hover:scale-105 disabled:cursor-wait disabled:opacity-50 ${
        isFavorite
          ? "bg-rose-600 text-white"
          : "bg-white/95 text-now-700 hover:bg-rose-50 hover:text-rose-600"
      } ${className}`}
      disabled={!isInitialized}
      onClick={() => toggleFavorite(storeId, productId)}
      type="button"
    >
      <svg
        aria-hidden="true"
        className="size-5"
        fill={isFavorite ? "currentColor" : "none"}
        viewBox="0 0 24 24"
      >
        <path
          d="M20.8 8.8c0 5.2-8.8 10-8.8 10s-8.8-4.8-8.8-10A4.8 4.8 0 0 1 12 6.7a4.8 4.8 0 0 1 8.8 2.1Z"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="1.8"
        />
      </svg>
    </button>
  );
}

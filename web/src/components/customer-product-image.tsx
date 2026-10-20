import Image from "next/image";
import { useLocale, useTranslations } from "next-intl";
import {
  formatPrice,
  getSafeImageUrl,
  shouldUnoptimizeImage,
  type MenuItem,
} from "@/lib/api";

export function CustomerProductImage({
  product,
  variant,
}: {
  product: MenuItem;
  variant: "home" | "menu";
}) {
  const locale = useLocale();
  const t = useTranslations("product");
  const name = locale === "en" ? product.name : product.nameAr || product.name;
  const category =
    locale === "en"
      ? product.category?.name || product.category?.nameAr
      : product.category?.nameAr || product.category?.name;
  const imageUrl = getSafeImageUrl(product.image);
  const imageSizes =
    variant === "menu"
      ? "(max-width: 639px) 112px, 120px"
      : "(max-width: 639px) calc((100vw - 84px) / 2), (max-width: 1023px) calc((100vw - 140px) / 3), (max-width: 1247px) calc((100vw - 176px) / 4), 268px";
  const ratingCount = Number(product.ratingsCount ?? 0);
  const rating = Number(product.averageRating ?? 0);
  const originalPrice = Number(product.originalPrice || 0);
  const hasDiscount =
    Number(product.discountValue || 0) > 0 &&
    originalPrice > Number(product.price);

  return (
    <div
      className={`relative ${
        variant === "home"
          ? "aspect-[16/10]"
          : "aspect-[4/3] sm:aspect-square"
      } overflow-hidden bg-gradient-to-br from-now-100 to-emerald-50 ${
        product.isAvailable ? "" : "grayscale"
      }`}
    >
      {imageUrl ? (
        <Image
          alt={name}
          className="object-cover"
          fill
          sizes={imageSizes}
          src={imageUrl}
          unoptimized={shouldUnoptimizeImage(imageUrl)}
        />
      ) : (
        <div className="absolute inset-0 grid place-items-center bg-[radial-gradient(circle_at_30%_25%,rgba(255,255,255,.8),transparent_45%),linear-gradient(135deg,#ddf3e8,#c1e5d4)] text-5xl font-black text-now-600/80">
          {name.slice(0, 1)}
        </div>
      )}

      {variant === "menu" && (
        <div className="absolute inset-x-0 top-0 flex items-start justify-between gap-1 p-2">
          {hasDiscount ? (
            <span className="max-w-[55%] truncate rounded-md bg-slate-950/80 px-2 py-1 text-[10px] font-extrabold text-red-200">
              {Number(product.discountPercentage) > 0
                ? t("discount", {
                    percentage: Number(product.discountPercentage),
                  })
                : formatPrice(product.discountValue || 0, locale)}
            </span>
          ) : (
            <span />
          )}
          {category && (
            <span className="max-w-[55%] truncate rounded-md bg-slate-950/80 px-2 py-1 text-[10px] font-bold text-now-gold">
              {category}
            </span>
          )}
        </div>
      )}

      {variant === "menu" && (
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-slate-950/90 via-slate-950/75 to-transparent px-2 pb-2 pt-7 text-white sm:px-3 sm:pb-3">
          <div className="mt-1 flex flex-wrap items-center justify-end gap-x-1.5 gap-y-1">
            <span className="text-xs font-black sm:text-sm">
              {formatPrice(product.price, locale)}
            </span>
            {hasDiscount && (
              <span className="text-[10px] text-white/65 line-through">
                {formatPrice(product.originalPrice || product.price, locale)}
              </span>
            )}
            {ratingCount > 0 && (
              <span className="text-[10px] font-bold text-amber-200">
                ★ {rating.toFixed(1)} ({ratingCount})
              </span>
            )}
          </div>
        </div>
      )}
      {!product.isAvailable && (
        <span className="absolute left-2 top-2 rounded-full bg-white/95 px-2.5 py-1 text-[10px] font-extrabold text-slate-700 shadow-sm">
          {t("unavailable")}
        </span>
      )}
    </div>
  );
}

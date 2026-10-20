"use client";

import Image from "next/image";
import { Link } from "@/i18n/navigation";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  formatPrice,
  getSafeImageUrl,
  shouldUnoptimizeImage,
  type MenuItem,
  type Store,
} from "@/lib/api";
import { useCart } from "./cart-provider";
import { CustomerProductImage } from "./customer-product-image";
import { ProductFavoriteButton } from "./product-favorite-button";
import { useToast } from "./toast-provider";

type LocationPoint = { latitude: number; longitude: number };
type NearbyStore = { store: Store; distance: number };
type ProductEntry = { store: Store; product: MenuItem };

function getCategoryName(
  category: MenuItem["category"] | Store["category"],
  locale: string,
) {
  return (
    (locale === "en" ? category?.name?.trim() : category?.nameAr?.trim()) ||
    category?.name?.trim() ||
    category?.nameAr?.trim() ||
    ""
  );
}

function getProductName(product: MenuItem, locale: string) {
  return locale === "en" ? product.name : product.nameAr || product.name;
}

function distanceBetween(first: LocationPoint, second: LocationPoint) {
  const radians = (degrees: number) => (degrees * Math.PI) / 180;
  const latitudeDelta = radians(second.latitude - first.latitude);
  const longitudeDelta = radians(second.longitude - first.longitude);
  const firstLatitude = radians(first.latitude);
  const secondLatitude = radians(second.latitude);
  const value =
    Math.sin(latitudeDelta / 2) ** 2 +
    Math.cos(firstLatitude) *
      Math.cos(secondLatitude) *
      Math.sin(longitudeDelta / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(value), Math.sqrt(1 - value));
}

const FAVORITES_STORAGE_KEY = "now_favorite_stores";

function FeaturedProductCarousel({ products }: { products: ProductEntry[] }) {
  const t = useTranslations("discovery");
  const locale = useLocale();
  const [activeIndex, setActiveIndex] = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (
      products.length < 2 ||
      paused ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      return;
    }
    const timer = window.setInterval(() => {
      if (document.visibilityState === "visible") {
        setActiveIndex((index) => (index + 1) % products.length);
      }
    }, 7000);
    return () => window.clearInterval(timer);
  }, [paused, products.length]);

  const changeSlide = (direction: number) => {
    setActiveIndex((index) => (index + direction + products.length) % products.length);
  };

  if (products.length === 0) return null;

  return (
    <section
      aria-label={t("customerPicks")}
      aria-roledescription="carousel"
      className="mx-auto mt-5 w-full sm:mt-8"
      onFocus={() => setPaused(true)}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onBlur={(event) => {
        if (
          !(event.relatedTarget instanceof Node) ||
          !event.currentTarget.contains(event.relatedTarget)
        ) {
          setPaused(false);
        }
      }}
      role="region"
    >
      <div className="relative overflow-hidden rounded-[24px] bg-now-900 shadow-[0_14px_36px_rgba(24,51,45,0.18)] sm:rounded-[30px]">
        <div
          className="flex h-[230px] transition-transform duration-1000 ease-in-out sm:h-[340px]"
          dir="ltr"
          style={{ transform: `translateX(-${activeIndex * 100}%)` }}
        >
          {products.map(({ store, product }, index) => {
            const imageUrl = getSafeImageUrl(product.image);
            const name = getProductName(product, locale);
            return (
              <Link
                aria-label={`${t("goToSlide", { number: index + 1 })}: ${name} — ${store.name}`}
                aria-roledescription="slide"
                className="relative h-full w-full shrink-0"
                href={`/stores/${store.id}/products/${product.id}`}
                key={`${store.id}-${product.id}`}
                role="group"
                tabIndex={index === activeIndex ? 0 : -1}
              >
                {imageUrl ? (
                  <Image
                    alt={name}
                    className="object-cover"
                    fill
                    loading={index === activeIndex ? "eager" : "lazy"}
                    sizes="(max-width: 639px) 100vw, 1200px"
                    src={imageUrl}
                    unoptimized={shouldUnoptimizeImage(imageUrl)}
                  />
                ) : (
                  <div className="absolute inset-0 bg-gradient-to-br from-now-500 to-now-900" />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-now-900 via-now-900/25 to-transparent" />
                <div
                  className="absolute inset-x-0 bottom-0 p-5 text-white sm:p-8"
                  dir={locale === "ar" ? "rtl" : "ltr"}
                >
                  <p className="text-xs font-extrabold text-now-gold sm:text-sm">
                    {t("customerPicks")}
                  </p>
                  <h2 className="mt-2 line-clamp-2 text-xl font-black sm:text-3xl">
                    {name}
                  </h2>
                  <p className="mt-1 text-xs font-semibold text-white/80 sm:text-sm">
                    {store.name}
                  </p>
                  <strong className="mt-2 inline-block text-sm font-black text-now-gold sm:text-base">
                    {formatPrice(product.price, locale)}
                  </strong>
                </div>
              </Link>
            );
          })}
        </div>
        {products.length > 1 && (
          <>
            <button
              aria-label={t("previousSlide")}
              className="absolute left-3 top-1/2 grid size-10 -translate-y-1/2 place-items-center rounded-full bg-white/90 text-xl font-black text-now-900 shadow-md transition hover:bg-white"
              onClick={() => changeSlide(-1)}
              type="button"
            >
              ‹
            </button>
            <button
              aria-label={t("nextSlide")}
              className="absolute right-3 top-1/2 grid size-10 -translate-y-1/2 place-items-center rounded-full bg-white/90 text-xl font-black text-now-900 shadow-md transition hover:bg-white"
              onClick={() => changeSlide(1)}
              type="button"
            >
              ›
            </button>
          </>
        )}
      </div>
    </section>
  );
}

function DiscoveryCategoryCarousel({
  categories,
  onSelect,
}: {
  categories: Array<{
    id: string;
    name: string;
    image: string | null;
    category: string | null;
  }>;
  onSelect: (name: string, category: string | null) => void;
}) {
  const t = useTranslations("discovery");
  const locale = useLocale();
  const railRef = useRef<HTMLDivElement>(null);
  const indexRef = useRef(0);
  const draggingRef = useRef(false);

  useEffect(() => {
    const rail = railRef.current;
    const container = rail?.parentElement;
    if (
      !rail ||
      !container ||
      categories.length < 2 ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      return;
    }
    const timer = window.setInterval(() => {
      if (
        document.visibilityState !== "visible" ||
        container.matches(":hover") ||
        container.contains(document.activeElement) ||
        draggingRef.current
      ) {
        return;
      }
      indexRef.current = (indexRef.current + 1) % categories.length;
      rail.children.item(indexRef.current)?.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
        inline: "center",
      });
    }, 5500);
    return () => {
      window.clearInterval(timer);
    };
  }, [categories.length]);

  return (
    <section
      className="mx-auto my-2 w-full px-1 py-2 sm:my-3 sm:px-3 sm:py-3"
      onPointerDown={() => {
        draggingRef.current = true;
      }}
      onPointerLeave={() => {
        draggingRef.current = false;
      }}
      onPointerUp={() => {
        draggingRef.current = false;
      }}
    >
      <h2
        className={`mb-2 text-lg font-black text-now-900 sm:mb-3 sm:text-2xl ${
          locale === "ar" ? "text-right" : "text-left"
        }`}
      >
        {t("discoverMore")}
      </h2>
      <div
        aria-label={t("discoverMore")}
        className="flex snap-x snap-mandatory gap-4 overflow-x-auto overscroll-x-contain scroll-smooth px-[calc(50%-84px)] pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:gap-7 sm:px-[calc(50%-96px)]"
        dir="ltr"
        onScroll={(event) => {
          const rail = event.currentTarget;
          const firstItem = rail.firstElementChild;
          if (!firstItem) return;
          const itemStep =
            firstItem.getBoundingClientRect().width +
            Number.parseFloat(getComputedStyle(rail).columnGap || "0");
          if (itemStep > 0) {
            indexRef.current = Math.min(
              categories.length - 1,
              Math.max(0, Math.round(rail.scrollLeft / itemStep)),
            );
          }
        }}
        ref={railRef}
        role="region"
        tabIndex={0}
      >
        {categories.map(({ id, name, image, category }) => (
          <button
            className="flex w-[168px] shrink-0 snap-center flex-col items-center gap-2 text-center transition-transform hover:scale-[1.03] sm:w-48 sm:gap-2.5"
            dir={locale === "ar" ? "rtl" : "ltr"}
            key={id}
            onClick={() => onSelect(name, category)}
            type="button"
          >
            <span className="relative grid size-[152px] place-items-center overflow-hidden rounded-full border-4 border-white bg-now-50 shadow-[0_5px_18px_rgba(24,51,45,0.12)] ring-2 ring-now-100 transition-transform duration-200 hover:scale-105 sm:size-40">
              {image ? (
                <Image
                  alt=""
                  className="object-cover"
                  fill
                  sizes="160px"
                  src={image}
                  unoptimized={shouldUnoptimizeImage(image)}
                />
              ) : (
                <span className="text-2xl font-black text-now-600">
                  {name.slice(0, 1)}
                </span>
              )}
            </span>
            <span className="line-clamp-2 text-sm font-extrabold leading-5 text-now-900 sm:text-base">
              {name}
            </span>
          </button>
        ))}
      </div>
    </section>
  );
}

function StoreTile({
  store,
  distanceKm,
  isFavorite,
  favoritesInitialized,
  onToggleFavorite,
}: {
  store: Store;
  distanceKm?: number;
  isFavorite: boolean;
  favoritesInitialized: boolean;
  onToggleFavorite: (storeId: number) => void;
}) {
  const t = useTranslations("store");
  const discoveryT = useTranslations("discovery");
  const locale = useLocale();
  const imageUrl = getSafeImageUrl(store.image);
  const cardClassName =
    "group overflow-hidden rounded-2xl border border-now-900/[0.06] bg-white shadow-[0_5px_18px_rgba(29,63,52,0.05)] transition duration-200 hover:-translate-y-0.5 hover:border-now-600/20 hover:shadow-[0_16px_36px_rgba(24,51,45,0.12)] focus-visible:outline-3 focus-visible:outline-offset-4 focus-visible:outline-now-500";
  const imageVisual = (
    <div className="relative h-[132px] overflow-hidden bg-gradient-to-br from-now-100 to-emerald-50">
        {imageUrl ? (
          <Image
            alt={t("imageAlt", { name: store.name })}
            className={`object-cover transition duration-500 group-hover:scale-105 ${store.isOpen ? "" : "grayscale"}`}
            fill
            sizes="(max-width: 639px) 100vw, (max-width: 1023px) 50vw, 33vw"
            src={imageUrl}
            unoptimized={shouldUnoptimizeImage(imageUrl)}
          />
        ) : (
          <div className="absolute inset-0 grid place-items-center bg-[radial-gradient(circle_at_30%_25%,rgba(255,255,255,.8),transparent_45%),linear-gradient(135deg,#ddf3e8,#c1e5d4)] text-6xl font-black text-now-600/80">
            {store.name.slice(0, 1)}
          </div>
        )}
        <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-now-900/35 to-transparent" />
        <div className="absolute right-3 top-3 flex items-center gap-2">
          {store.isOpen ? (
            <span className="rounded-full border border-white/70 bg-white/95 px-3 py-1.5 text-xs font-extrabold text-now-700 shadow-sm">
              {t("open")}
            </span>
          ) : (
            <span className="rounded-full border border-white/70 bg-white/95 px-3 py-1.5 text-xs font-bold text-now-900 shadow-sm">
              {t("closed")}
            </span>
          )}
        </div>
    </div>
  );
  const imageContent = (
    <div className="relative">
      {store.isOpen ? (
        <Link aria-label={store.name} className="block" href={`/stores/${store.id}`}>
          {imageVisual}
        </Link>
      ) : (
        imageVisual
      )}
      <div className="absolute left-2 top-2 z-10 flex items-center gap-1">
        <button
          aria-label={isFavorite ? discoveryT("removeFavorite") : discoveryT("saveFavorite")}
          aria-pressed={isFavorite}
          className={`grid size-9 place-items-center rounded-full border border-white/80 shadow-sm transition disabled:cursor-wait disabled:opacity-50 ${
            isFavorite
              ? "bg-rose-600 text-white"
              : "bg-white/95 text-now-700 hover:bg-rose-50 hover:text-rose-600"
          }`}
          onClick={() => onToggleFavorite(store.id)}
          disabled={!favoritesInitialized}
          type="button"
        >
          <HeartIcon filled={isFavorite} />
        </button>
        {store.category && (
          <span className="max-w-20 truncate rounded-full bg-slate-950/65 px-2 py-1 text-[10px] font-bold text-white">
            {getCategoryName(store.category, locale)}
          </span>
        )}
      </div>
    </div>
  );
  const cardDetails = (
    <div className="min-w-0 p-2.5 sm:p-4">
      <div className="flex min-w-0 items-start justify-between gap-1.5">
        <h3 className="line-clamp-2 min-h-10 min-w-0 break-words text-sm font-extrabold leading-5 text-now-900 transition-colors group-hover:text-now-600 sm:text-lg sm:leading-6">
          {store.name}
        </h3>
          {Number(store.ratingAverage) > 0 && (
            <span className="inline-flex shrink-0 items-center gap-1 rounded-lg bg-amber-50 px-1.5 py-1 text-[10px] font-extrabold text-amber-800 sm:px-2 sm:text-xs">
              <span aria-hidden="true">★</span>
              {Number(store.ratingAverage).toFixed(1)}
            </span>
          )}
      </div>
      <p className="mt-1 line-clamp-2 min-h-10 text-[11px] leading-5 text-now-700 sm:mt-2 sm:min-h-11 sm:text-sm sm:leading-6">
        {store.description || t("fallbackDescription")}
      </p>
      <div className="mt-2 flex min-w-0 items-center justify-between gap-1 border-t border-now-900/[0.06] pt-2 text-[10px] sm:mt-4 sm:gap-2 sm:pt-3 sm:text-sm">
        {distanceKm !== undefined ? (
          <span className="truncate font-bold text-now-700">
            {t("distance", {
              distance:
                distanceKm < 1
                  ? t("meters", { distance: Math.round(distanceKm * 1000) })
                  : t("kilometers", { distance: distanceKm.toFixed(1) }),
            })}
          </span>
        ) : (
          <span className="truncate font-bold text-now-700">
            {t("productCount", { count: (store.menuItems || []).length })}
          </span>
        )}
        <span className="shrink-0 font-extrabold text-now-600">
          {store.isOpen ? t("browseStore") : t("closed")}
          {store.isOpen && <span aria-hidden="true"> ←</span>}
        </span>
      </div>
    </div>
  );

  if (!store.isOpen) {
    return (
      <article className={`${cardClassName} cursor-not-allowed opacity-80`}>
        {imageContent}
        {cardDetails}
      </article>
    );
  }

  return (
    <article className={cardClassName}>
      {imageContent}
      <Link className="block" href={`/stores/${store.id}`}>
        {cardDetails}
      </Link>
    </article>
  );
}

function ProductTile({ store, product }: { store: Store; product: MenuItem }) {
  const locale = useLocale();
  const cartT = useTranslations("cart");
  const toastT = useTranslations("toast");
  const { items, isInitialized: cartInitialized, addItem, setQuantity } = useCart();
  const { showToast } = useToast();
  const name = getProductName(product, locale);
  const isRtl = locale === "ar";
  const quantity =
    items.find(
      (item) => item.storeId === store.id && item.productId === product.id,
    )?.quantity || 0;
  const cartQuantity = quantity;

  function add() {
    const result = addItem({ id: store.id, name: store.name }, product);
    if (result === "added") {
      showToast(toastT("addedToCart"), "success");
    } else if (result === "different-store") {
      showToast(toastT("otherStoreCart"), "error");
    } else {
      showToast(toastT("invalidProduct"), "error");
    }
  }

  return (
    <article className="relative rounded-[20px] border border-now-900/10 bg-white p-2 shadow-[0_3px_12px_rgba(18,107,87,0.08)] transition-transform duration-150 active:scale-[0.98] sm:p-2.5">
      <Link
        aria-label={`${name} — ${store.name}`}
        className="block"
        href={`/stores/${store.id}`}
      >
        <div className="overflow-hidden rounded-[15px]">
          <CustomerProductImage product={product} variant="home" />
        </div>
        <div className={`px-1 pt-2 ${isRtl ? "text-right" : "text-left"}`}>
          <h3 className="line-clamp-2 min-h-10 text-sm font-extrabold leading-5 text-now-900">
            {name}
          </h3>
          <p className="mt-1 truncate text-xs font-semibold text-now-700">
            {store.name}
          </p>
        </div>
      </Link>
      <ProductFavoriteButton
        className="absolute right-3 top-3 z-10 size-9"
        productId={product.id}
        storeId={store.id}
      />
      <div className="mt-2 flex items-center justify-between gap-2 px-1 pb-1">
        <span className="truncate text-sm font-black text-now-700">
          {formatPrice(product.price, locale)}
        </span>
        {product.isAvailable &&
          (cartQuantity > 0 ? (
            <div className="flex shrink-0 items-center gap-1">
              <button
                aria-label={cartT("decreaseQuantity", { name })}
                className="grid size-8 place-items-center rounded-full bg-now-50 text-lg font-bold text-now-700 disabled:opacity-50"
                disabled={!cartInitialized}
                onClick={() => setQuantity(product.id, cartQuantity - 1)}
                type="button"
              >
                −
              </button>
              <span className="min-w-5 text-center text-xs font-black text-now-900">
                {cartQuantity}
              </span>
              <button
                aria-label={cartT("increaseQuantity", { name })}
                className="grid size-8 place-items-center rounded-full bg-now-600 text-lg font-bold text-white disabled:opacity-50"
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
              className="grid size-10 shrink-0 place-items-center rounded-2xl bg-now-600 text-2xl font-medium text-white transition hover:bg-now-700 disabled:opacity-50"
              disabled={!cartInitialized}
              onClick={add}
              type="button"
            >
              +
            </button>
          ))}
      </div>
    </article>
  );
}

function HeartIcon({ filled }: { filled: boolean }) {
  return (
    <svg aria-hidden="true" className="size-4" fill={filled ? "currentColor" : "none"} viewBox="0 0 24 24">
      <path
        d="M20.8 8.8c0 5.2-8.8 10-8.8 10s-8.8-4.8-8.8-10A4.8 4.8 0 0 1 12 6.7a4.8 4.8 0 0 1 8.8 2.1Z"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
    </svg>
  );
}

export function HomepageDiscovery({ stores }: { stores: Store[] }) {
  const t = useTranslations("discovery");
  const locale = useLocale();
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState("");
  const [storeFilter, setStoreFilter] = useState<
    "all" | "open" | "closed" | "favorites"
  >("all");
  const [favoriteStoreIds, setFavoriteStoreIds] = useState<string[]>([]);
  const [favoriteError, setFavoriteError] = useState("");
  const [favoritesInitialized, setFavoritesInitialized] = useState(false);
  const [location, setLocation] = useState<LocationPoint | null>(null);
  const [locationError, setLocationError] = useState("");
  const [locationLoading, setLocationLoading] = useState(false);
  const { items: cartItems, itemCount } = useCart();
  const cartTotal = cartItems.reduce(
    (total, item) => total + item.price * item.quantity,
    0,
  );
  const normalizedSearch = search.trim().toLocaleLowerCase(locale);

  useEffect(() => {
    const initializeTimer = window.setTimeout(() => {
      try {
        const stored = window.localStorage.getItem(FAVORITES_STORAGE_KEY);
        if (!stored) return;
        const parsed: unknown = JSON.parse(stored);
        if (
          !Array.isArray(parsed) ||
          !parsed.every((id) => typeof id === "string" || typeof id === "number")
        ) {
          throw new Error("Saved favorite stores are invalid.");
        }
        setFavoriteStoreIds(parsed.map(String));
        setFavoriteError("");
      } catch (error) {
        console.error("Could not load saved favorite stores:", error);
        setFavoriteError(t("favoritesLoadFailed"));
      } finally {
        setFavoritesInitialized(true);
      }
    }, 0);
    return () => window.clearTimeout(initializeTimer);
  }, [t]);

  function toggleFavorite(storeId: number) {
    const id = String(storeId);
    const nextIds = favoriteStoreIds.includes(id)
      ? favoriteStoreIds.filter((favoriteId) => favoriteId !== id)
      : [...favoriteStoreIds, id];
    try {
      window.localStorage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify(nextIds));
      setFavoriteStoreIds(nextIds);
      setFavoriteError("");
    } catch (error) {
      console.error("Could not save favorite stores:", error);
      setFavoriteError(t("favoritesSaveFailed"));
    }
  }

  const availableProducts = useMemo(
    () =>
      stores
        .filter((store) => store.isOpen)
        .flatMap((store) =>
          (store.menuItems || [])
            .filter((product) => product.isAvailable)
            .map((product) => ({ store, product })),
        ),
    [stores],
  );
  const featuredProducts = useMemo(() => {
    const seenImages = new Set<string>();
    return availableProducts
      .filter(({ store, product }) => {
        const imageKey =
          getSafeImageUrl(product.image) || `${store.id}:${product.id}`;
        if (seenImages.has(imageKey)) return false;
        seenImages.add(imageKey);
        return true;
      })
      .slice(0, 5);
  }, [availableProducts]);
  const discoveryCategories = useMemo(
    () =>
      availableProducts.map(({ store, product }) => ({
        id: `${store.id}:${product.id}`,
        name: getProductName(product, locale),
        image: getSafeImageUrl(product.image) || getSafeImageUrl(store.image),
        category: null,
      })),
    [availableProducts, locale],
  );

  const categories = useMemo(() => {
    const labels = new Set<string>();
    for (const store of stores) {
      const storeCategory = getCategoryName(store.category, locale);
      if (storeCategory) labels.add(storeCategory);
      for (const item of store.menuItems || []) {
        const itemCategory = getCategoryName(item.category, locale);
        if (itemCategory) labels.add(itemCategory);
      }
    }
    return [...labels].sort((first, second) =>
      first.localeCompare(second, locale),
    );
  }, [locale, stores]);

  const featuredStores = useMemo(
    () =>
      [...stores]
        .filter(
          (store) =>
            Number(store.ratingCount) > 0 &&
            Number.isFinite(Number(store.ratingAverage)) &&
            Number(store.ratingAverage) > 0,
        )
        .sort(
          (first, second) =>
            Number(second.ratingAverage) - Number(first.ratingAverage) ||
            Number(second.ratingCount) - Number(first.ratingCount),
        )
        .slice(0, 3),
    [stores],
  );

  const matchingStores = useMemo(
    () =>
      stores.filter((store) => {
        const categoryMatches =
          !activeCategory ||
          getCategoryName(store.category, locale) === activeCategory ||
          (store.menuItems || []).some(
            (item) => getCategoryName(item.category, locale) === activeCategory,
          );
        if (!categoryMatches || !normalizedSearch) return categoryMatches;
        const searchable = [
          store.name,
          store.description || "",
          ...(store.menuItems || []).flatMap((item) => [
            getProductName(item, locale),
            item.description || "",
          ]),
        ]
          .join(" ")
          .toLocaleLowerCase(locale);
        return searchable.includes(normalizedSearch);
      }),
    [activeCategory, locale, normalizedSearch, stores],
  );

  const matchingProducts = useMemo(
    () =>
      normalizedSearch
        ? stores.flatMap((store) =>
            (store.isOpen ? store.menuItems || [] : [])
              .filter((product) => {
                if (!product.isAvailable) return false;
                const categoryMatches =
                  !activeCategory ||
                  getCategoryName(product.category, locale) === activeCategory ||
                  getCategoryName(store.category, locale) === activeCategory;
                const text =
                  `${getProductName(product, locale)} ${product.description || ""}`.toLocaleLowerCase(
                    locale,
                  );
                return categoryMatches && text.includes(normalizedSearch);
              })
              .map((product) => ({ store, product })),
          )
        : [],
    [activeCategory, locale, normalizedSearch, stores],
  );
  const visibleStores = useMemo(
    () =>
      matchingStores
        .filter((store) => {
          if (storeFilter === "open") return store.isOpen;
          if (storeFilter === "closed") return !store.isOpen;
          if (storeFilter === "favorites") {
            return favoriteStoreIds.includes(String(store.id));
          }
          return true;
        })
        .sort((first, second) => Number(second.isOpen) - Number(first.isOpen)),
    [favoriteStoreIds, matchingStores, storeFilter],
  );
  const visibleMatchingProducts =
    storeFilter === "closed" ? [] : matchingProducts;
  const visibleProducts = normalizedSearch
    ? visibleMatchingProducts
    : availableProducts.filter(
        ({ store, product }) =>
          !activeCategory ||
          getCategoryName(product.category, locale) === activeCategory ||
          getCategoryName(store.category, locale) === activeCategory,
      );

  const nearbyStores: NearbyStore[] = useMemo(() => {
    if (!location) return [];
    return stores
      .map((store) => {
        const latitude = Number(store.latitude);
        const longitude = Number(store.longitude);
        if (
          store.latitude === null ||
          store.latitude === undefined ||
          store.longitude === null ||
          store.longitude === undefined ||
          !Number.isFinite(latitude) ||
          !Number.isFinite(longitude) ||
          latitude < -90 ||
          latitude > 90 ||
          longitude < -180 ||
          longitude > 180
        ) {
          return null;
        }
        return {
          store,
          distance: distanceBetween(location, { latitude, longitude }),
        };
      })
      .filter((result): result is NearbyStore => result !== null)
      .sort((first, second) => first.distance - second.distance)
      .slice(0, 4);
  }, [location, stores]);

  function requestLocation() {
    if (!navigator.geolocation) {
      setLocationError(t("locationUnsupported"));
      return;
    }
    setLocationLoading(true);
    setLocationError("");
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocation({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        });
        setLocationLoading(false);
      },
      (error) => {
        console.error("Homepage location request failed:", error);
        setLocationError(
          error.code === error.PERMISSION_DENIED
            ? t("locationDenied")
            : t("locationFailed"),
        );
        setLocationLoading(false);
      },
      { enableHighAccuracy: false, timeout: 12000, maximumAge: 300000 },
    );
  }

  return (
    <>
      {!normalizedSearch && !activeCategory && featuredProducts.length > 0 && (
        <section className="mx-auto w-[min(1200px,calc(100%-32px))] sm:w-[min(1200px,calc(100%-48px))]">
          <FeaturedProductCarousel products={featuredProducts} />
        </section>
      )}

      <section className="relative z-10 mx-auto mt-4 w-[min(1040px,calc(100%-32px))] sm:mt-5 sm:w-[min(1040px,calc(100%-48px))]">
        <label aria-label={t("searchRegion")} className="flex min-h-14 items-center gap-3 rounded-2xl border border-now-900/[0.07] bg-white px-4 shadow-[0_16px_45px_rgba(24,51,45,0.12)] transition focus-within:border-now-500 focus-within:ring-4 focus-within:ring-now-500/10 sm:min-h-16 sm:gap-4 sm:rounded-3xl sm:px-6">
          <svg aria-hidden="true" className="size-6 shrink-0 text-now-600" fill="none" viewBox="0 0 24 24">
            <circle cx="10.8" cy="10.8" r="6.8" stroke="currentColor" strokeWidth="1.8" />
            <path d="m16 16 4.5 4.5" stroke="currentColor" strokeLinecap="round" strokeWidth="1.8" />
          </svg>
          <input
            aria-label={t("searchLabel")}
            className="min-w-0 flex-1 bg-transparent text-sm font-semibold text-now-900 outline-none placeholder:text-now-900/40 sm:text-base"
            onChange={(event) => setSearch(event.target.value)}
            placeholder={t("searchPlaceholder")}
            type="search"
            value={search}
          />
          {search && (
            <button
              aria-label={t("clearSearch")}
              className="grid size-10 shrink-0 place-items-center rounded-xl text-xl text-now-900/45 hover:bg-now-50 hover:text-now-700"
              onClick={() => setSearch("")}
              type="button"
            >
              ×
            </button>
          )}
          <Link
            className="hidden min-h-11 items-center justify-center rounded-xl bg-now-600 px-5 text-sm font-extrabold text-white transition hover:bg-now-700 sm:inline-flex"
            href="#stores"
          >
            {t("search")}
          </Link>
        </label>

        {categories.length > 0 && (
          <div className="mt-8">
            <div className="mb-4 flex items-end justify-between gap-3">
              <div>
                <p className="text-xs font-extrabold text-now-600">{t("chooseQuickly")}</p>
                <h2 className="mt-1 text-lg font-black text-now-900 sm:text-xl">
                  {t("browseByCategory")}
                </h2>
              </div>
              <span className="text-xs font-semibold text-now-700">
                {t("categoryCount", { count: categories.length })}
              </span>
            </div>
            <div className="flex gap-2 overflow-x-auto pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {[t("all"), ...categories].map((category) => {
                const selected =
                  category === t("all")
                    ? !activeCategory
                    : category === activeCategory;
                return (
                  <button
                    aria-pressed={selected}
                    className={`min-h-11 shrink-0 rounded-full border px-5 text-sm font-extrabold transition duration-200 ${
                      selected
                        ? "border-now-600 bg-now-600 text-white shadow-md shadow-now-600/20"
                        : "border-now-900/10 bg-white text-now-900/65 hover:border-now-600/30 hover:bg-now-50 hover:text-now-700"
                    }`}
                    key={category}
                    onClick={() =>
                      setActiveCategory(category === t("all") ? "" : category)
                    }
                    type="button"
                  >
                    {category}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </section>

      {visibleProducts.length > 0 && (
        <section className="mx-auto mt-8 w-[min(1200px,calc(100%-32px))] sm:mt-12 sm:w-[min(1200px,calc(100%-48px))]">
          <SectionHeading
            eyebrow={t("chooseQuickly")}
            title={normalizedSearch ? t("matchingProducts") : t("availableProducts")}
            trailing={t("productCount", { count: visibleProducts.length })}
          />
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4">
            {visibleProducts.slice(0, 6).map(({ store, product }) => (
              <ProductTile
                key={`${store.id}-${product.id}`}
                product={product}
                store={store}
              />
            ))}
          </div>
          {!normalizedSearch &&
            !activeCategory &&
            discoveryCategories.length > 0 && (
              <DiscoveryCategoryCarousel
                categories={discoveryCategories}
                onSelect={(name, category) => {
                  if (category) {
                    setSearch("");
                    setActiveCategory(category);
                  } else {
                    setActiveCategory("");
                    setSearch(name);
                  }
                }}
              />
            )}
          {visibleProducts.length > 6 && (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4">
              {visibleProducts.slice(6).map(({ store, product }) => (
                <ProductTile
                  key={`${store.id}-${product.id}`}
                  product={product}
                  store={store}
                />
              ))}
            </div>
          )}
        </section>
      )}

      {!normalizedSearch && !activeCategory && featuredStores.length > 0 && (
        <section className="mx-auto mt-14 w-[min(1200px,calc(100%-32px))] sm:mt-20 sm:w-[min(1200px,calc(100%-48px))]">
          <SectionHeading
            eyebrow={t("customerPicks")}
            title={t("topRated")}
            trailing={t("ratedByCustomers")}
          />
          <div className="grid grid-cols-1 min-[360px]:grid-cols-2 gap-3 sm:gap-5 xl:grid-cols-3">
            {featuredStores.map((store) => (
              <StoreTile
                favoritesInitialized={favoritesInitialized}
                isFavorite={favoriteStoreIds.includes(String(store.id))}
                key={store.id}
                onToggleFavorite={toggleFavorite}
                store={store}
              />
            ))}
          </div>
        </section>
      )}

      <section className="mx-auto mt-14 w-[min(1200px,calc(100%-32px))] sm:mt-20 sm:w-[min(1200px,calc(100%-48px))]">
        <div className="mb-5 flex flex-col gap-4 sm:mb-6 sm:flex-row sm:items-end sm:justify-between">
          <SectionHeading
            eyebrow={t("nearby")}
            title={t("nearbyStores")}
          />
          <button
            className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-now-600/25 bg-white px-4 text-sm font-extrabold text-now-700 shadow-sm transition hover:border-now-600 hover:bg-now-50 disabled:cursor-wait disabled:opacity-60 sm:w-auto"
            disabled={locationLoading}
            onClick={requestLocation}
            type="button"
          >
            <LocationIcon />
            {locationLoading
              ? t("locating")
              : location
                ? t("updateLocation")
                : t("useLocation")}
          </button>
        </div>
        {locationError && (
          <p className="mb-4 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-800" role="alert">
            {locationError}
          </p>
        )}
        {location ? (
          nearbyStores.length > 0 ? (
            <div className="grid grid-cols-1 min-[360px]:grid-cols-2 gap-3 sm:gap-5 xl:grid-cols-3">
              {nearbyStores.map(({ store, distance }) => (
                <StoreTile
                  distanceKm={distance}
                  favoritesInitialized={favoritesInitialized}
                  isFavorite={favoriteStoreIds.includes(String(store.id))}
                  key={store.id}
                  onToggleFavorite={toggleFavorite}
                  store={store}
                />
              ))}
            </div>
          ) : (
            <p className="rounded-2xl border border-now-900/[0.06] bg-white p-5 text-sm leading-7 text-now-700">
              {t("noCoordinates")}
            </p>
          )
        ) : (
          <div className="flex flex-col gap-4 rounded-2xl border border-now-900/[0.06] bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:p-5">
            <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-now-50 text-now-600">
              <LocationIcon />
            </span>
            <p className="text-sm leading-7 text-now-700">
              {t("locationHint")}
            </p>
          </div>
        )}
      </section>

      <section
        className="mx-auto mt-14 w-[min(1200px,calc(100%-32px))] scroll-mt-24 pb-16 sm:mt-20 sm:w-[min(1200px,calc(100%-48px))]"
        id="stores"
      >
        <SectionHeading
          eyebrow={normalizedSearch ? t("searchResults") : t("pickWhatYouLike")}
          title={
            normalizedSearch
              ? t("storesAndProducts")
              : activeCategory
                ? t("storesAndProducts")
                : t("allStores")
          }
          trailing={`${t("storeCount", { count: visibleStores.length })}${normalizedSearch ? ` · ${t("productCount", { count: visibleMatchingProducts.length })}` : ""}${itemCount > 0 ? ` · ${t("inCart", { count: itemCount })}` : ""}`}
        />

        <div className="mb-5 flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {(["all", "open", "closed", "favorites"] as const).map((filter) => (
            <button
              aria-pressed={storeFilter === filter}
              className={`min-h-10 shrink-0 rounded-full border px-4 text-xs font-extrabold transition sm:text-sm ${
                storeFilter === filter
                  ? "border-now-600 bg-now-600 text-white shadow-md shadow-now-600/20"
                  : "border-now-900/10 bg-white text-now-900/65 hover:border-now-600/30 hover:bg-now-50 hover:text-now-700"
              }`}
              key={filter}
              onClick={() => setStoreFilter(filter)}
              type="button"
            >
              {t(
                filter === "all"
                  ? "allStores"
                  : filter === "favorites"
                    ? "favoriteStores"
                    : `${filter}Stores`,
              )}
            </button>
          ))}
        </div>
        {favoriteError && (
          <p className="mb-4 rounded-xl border border-red-200 bg-red-50 p-3 text-xs font-semibold text-red-800" role="alert">
            {favoriteError}
          </p>
        )}

        {visibleStores.length > 0 ? (
          <div className="grid grid-cols-1 min-[360px]:grid-cols-2 gap-3 sm:gap-5 xl:grid-cols-3">
            {visibleStores.map((store) => (
              <StoreTile
                favoritesInitialized={favoritesInitialized}
                isFavorite={favoriteStoreIds.includes(String(store.id))}
                key={store.id}
                onToggleFavorite={toggleFavorite}
                store={store}
              />
            ))}
          </div>
        ) : (
          <div className="rounded-3xl border border-now-900/[0.06] bg-white px-6 py-12 text-center shadow-sm sm:py-16">
            <span className="mx-auto grid size-14 place-items-center rounded-2xl bg-now-50 text-2xl text-now-600">
             ⌕
            </span>
            <h3 className="mt-4 text-lg font-black text-now-900">
              {t(normalizedSearch ? "noResults" : "noStoresInFilter")}
            </h3>
            {normalizedSearch && (
              <p className="mt-2 text-sm leading-6 text-now-700">
                {t("tryAnotherSearch")}
              </p>
            )}
          </div>
        )}
      </section>

      {itemCount > 0 && (
        <Link
          aria-label={`${t("cartSummary", { count: itemCount })} ${formatPrice(cartTotal, locale)}. ${t("viewCart")}`}
          className="fixed inset-x-3 bottom-3 z-40 mx-auto flex min-h-16 max-w-xl items-center justify-between gap-3 rounded-2xl border border-white/70 bg-now-900 px-4 py-3 text-white shadow-[0_14px_36px_rgba(24,51,45,0.3)] transition hover:bg-now-700 sm:bottom-5 sm:rounded-3xl sm:px-6"
          href="/cart"
        >
          <span className="min-w-0">
            <span className="block text-xs font-bold text-white/70">
              {t("cartSummary", { count: itemCount })}
            </span>
            <strong className="mt-0.5 block truncate text-base font-black text-now-gold sm:text-lg">
              {formatPrice(cartTotal, locale)}
            </strong>
          </span>
          <span className="inline-flex min-h-10 shrink-0 items-center gap-2 rounded-xl bg-now-gold px-4 text-sm font-black text-now-900">
            {t("viewCart")}
            <span aria-hidden="true">←</span>
          </span>
        </Link>
      )}
    </>
  );
}

function SectionHeading({
  eyebrow,
  title,
  trailing,
}: {
  eyebrow: string;
  title: string;
  trailing?: string;
}) {
  return (
    <div className="mb-5 flex items-end justify-between gap-3 sm:mb-6">
      <div>
        <p className="text-xs font-extrabold text-now-600 sm:text-sm">{eyebrow}</p>
        <h2 className="mt-1 text-xl font-black tracking-tight text-now-900 sm:text-2xl lg:text-3xl">
          {title}
        </h2>
      </div>
      {trailing && (
        <span className="pb-1 text-[11px] font-semibold text-now-700 sm:text-sm">
          {trailing}
        </span>
      )}
    </div>
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

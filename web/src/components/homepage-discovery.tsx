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
  type Store,
} from "@/lib/api";
import { useCart } from "./cart-provider";

type LocationPoint = { latitude: number; longitude: number };
type NearbyStore = { store: Store; distance: number };

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

function StoreTile({ store, distanceKm }: { store: Store; distanceKm?: number }) {
  const t = useTranslations("store");
  const locale = useLocale();
  const imageUrl = getSafeImageUrl(store.image);
  return (
    <Link
      className="group overflow-hidden rounded-3xl border border-now-900/[0.06] bg-white shadow-[0_10px_30px_rgba(24,51,45,0.06)] transition duration-300 hover:-translate-y-1 hover:border-now-600/20 hover:shadow-[0_20px_45px_rgba(24,51,45,0.12)] focus-visible:outline-3 focus-visible:outline-offset-4 focus-visible:outline-now-500"
      href={`/stores/${store.id}`}
    >
      <div className="relative aspect-[1.8] overflow-hidden bg-gradient-to-br from-now-100 to-emerald-50">
        {imageUrl ? (
          <Image
            alt={t("imageAlt", { name: store.name })}
            className="object-cover transition duration-500 group-hover:scale-105"
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
        {store.category && (
          <span className="absolute bottom-3 right-4 text-xs font-bold text-white drop-shadow">
            {getCategoryName(store.category, locale)}
          </span>
        )}
      </div>
      <div className="p-4 sm:p-5">
        <div className="flex items-start justify-between gap-3">
          <h3 className="min-w-0 truncate text-lg font-extrabold text-now-900 transition-colors group-hover:text-now-600">
            {store.name}
          </h3>
          {Number(store.ratingAverage) > 0 && (
            <span className="inline-flex shrink-0 items-center gap-1 rounded-lg bg-amber-50 px-2 py-1 text-xs font-extrabold text-amber-800">
              <span aria-hidden="true">★</span>
              {Number(store.ratingAverage).toFixed(1)}
            </span>
          )}
        </div>
        <p className="mt-2 line-clamp-2 min-h-11 text-sm leading-6 text-now-700">
          {store.description || t("fallbackDescription")}
        </p>
        <div className="mt-4 flex items-center justify-between gap-2 border-t border-now-900/[0.06] pt-3 text-sm">
          {distanceKm !== undefined ? (
            <span className="text-xs font-bold text-now-700">
              {t("distance", {
                distance:
                  distanceKm < 1
                    ? t("meters", { distance: Math.round(distanceKm * 1000) })
                    : t("kilometers", { distance: distanceKm.toFixed(1) }),
              })}
            </span>
          ) : (
            <span className="text-xs font-bold text-now-700">
              {t("productCount", { count: (store.menuItems || []).length })}
            </span>
          )}
          <span className="inline-flex items-center gap-2 font-extrabold text-now-600 transition group-hover:gap-3">
            {t("browseStore")} <span aria-hidden="true">←</span>
          </span>
        </div>
      </div>
    </Link>
  );
}

function ProductTile({ store, product }: { store: Store; product: MenuItem }) {
  const t = useTranslations("discovery");
  const locale = useLocale();
  const imageUrl = getSafeImageUrl(product.image);
  return (
    <Link
      className="group flex min-w-0 gap-3 rounded-2xl border border-now-900/[0.06] bg-white p-3 shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-now-500 sm:gap-4 sm:p-4"
      href={`/stores/${store.id}/products/${product.id}`}
    >
      <div className="relative size-20 shrink-0 overflow-hidden rounded-xl bg-now-50 sm:size-24">
        {imageUrl ? (
          <Image
            alt=""
            className="object-cover transition duration-300 group-hover:scale-105"
            fill
            sizes="96px"
            src={imageUrl}
            unoptimized={shouldUnoptimizeImage(imageUrl)}
          />
        ) : (
          <div className="absolute inset-0 grid place-items-center text-2xl font-black text-now-600">
            {getProductName(product, locale).slice(0, 1)}
          </div>
        )}
      </div>
      <div className="flex min-w-0 flex-1 flex-col justify-center">
        <span className="truncate text-sm font-extrabold text-now-900">
          {getProductName(product, locale)}
        </span>
        <span className="mt-1 truncate text-xs text-now-700">
          {t("fromStore", { name: store.name })}
        </span>
        <span className="mt-2 text-sm font-black text-now-600">
          {formatPrice(product.price, locale)}
        </span>
      </div>
      <span className="self-center rounded-xl bg-now-50 px-3 py-2 text-lg font-bold text-now-700 transition group-hover:bg-now-600 group-hover:text-white" aria-hidden="true">
        +
      </span>
    </Link>
  );
}

export function HomepageDiscovery({ stores }: { stores: Store[] }) {
  const t = useTranslations("discovery");
  const locale = useLocale();
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState("");
  const [location, setLocation] = useState<LocationPoint | null>(null);
  const [locationError, setLocationError] = useState("");
  const [locationLoading, setLocationLoading] = useState(false);
  const { itemCount } = useCart();
  const normalizedSearch = search.trim().toLocaleLowerCase(locale);

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
            (store.menuItems || [])
              .filter((product) => {
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
      <section className="relative z-10 mx-auto -mt-8 w-[min(1040px,calc(100%-32px))] sm:w-[min(1040px,calc(100%-48px))]">
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

      {!normalizedSearch && !activeCategory && featuredStores.length > 0 && (
        <section className="mx-auto mt-14 w-[min(1200px,calc(100%-32px))] sm:mt-20 sm:w-[min(1200px,calc(100%-48px))]">
          <SectionHeading
            eyebrow={t("customerPicks")}
            title={t("topRated")}
            trailing={t("ratedByCustomers")}
          />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5 xl:grid-cols-3">
            {featuredStores.map((store) => (
              <StoreTile key={store.id} store={store} />
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
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5 xl:grid-cols-3">
              {nearbyStores.map(({ store, distance }) => (
                <StoreTile
                  distanceKm={distance}
                  key={store.id}
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
                : t("availableStores")
          }
          trailing={`${t("storeCount", { count: matchingStores.length })}${normalizedSearch ? ` · ${t("productCount", { count: matchingProducts.length })}` : ""}${itemCount > 0 ? ` · ${t("inCart", { count: itemCount })}` : ""}`}
        />

        {normalizedSearch && matchingProducts.length > 0 && (
          <div className="mb-8">
            <h3 className="mb-3 text-sm font-extrabold text-now-900">
              {t("matchingProducts")}
            </h3>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {matchingProducts.slice(0, 8).map(({ store, product }) => (
                <ProductTile
                  key={`${store.id}-${product.id}`}
                  product={product}
                  store={store}
                />
              ))}
            </div>
          </div>
        )}

        {matchingStores.length > 0 ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5 xl:grid-cols-3">
            {matchingStores.map((store) => (
              <StoreTile key={store.id} store={store} />
            ))}
          </div>
        ) : matchingProducts.length === 0 ? (
          <div className="rounded-3xl border border-now-900/[0.06] bg-white px-6 py-12 text-center shadow-sm sm:py-16">
            <span className="mx-auto grid size-14 place-items-center rounded-2xl bg-now-50 text-2xl text-now-600">
             ⌕
            </span>
            <h3 className="mt-4 text-lg font-black text-now-900">
              {t("noResults")}
            </h3>
            <p className="mt-2 text-sm leading-6 text-now-700">
              {t("tryAnotherSearch")}
            </p>
          </div>
        ) : null}
      </section>
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

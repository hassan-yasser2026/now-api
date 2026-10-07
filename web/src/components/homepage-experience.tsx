"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ProductCard } from "@/components/product-card";
import { StoreCard } from "@/components/store-card";
import type { MenuItem, Store } from "@/lib/api";
import styles from "./homepage-experience.module.css";

type CategoryOption = {
  key: string;
  label: string;
};

type ProductResult = {
  store: Store;
  product: MenuItem;
};

type CustomerLocation = {
  latitude: number;
  longitude: number;
};

function productName(product: MenuItem) {
  return product.nameAr || product.name;
}

function categoryLabel(category: MenuItem["category"] | Store["category"]) {
  return category?.nameAr?.trim() || category?.name?.trim() || "";
}

function distanceBetween(
  first: CustomerLocation,
  second: CustomerLocation,
): number {
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

function categoryOptions(stores: Store[]): CategoryOption[] {
  const labels = new Set<string>();
  for (const store of stores) {
    const storeCategory = categoryLabel(store.category);
    if (storeCategory) labels.add(storeCategory);
    for (const item of store.menuItems || []) {
      const itemCategory = categoryLabel(item.category);
      if (itemCategory) labels.add(itemCategory);
    }
  }
  return [...labels]
    .sort((first, second) => first.localeCompare(second, "ar"))
    .map((label) => ({ key: label.toLocaleLowerCase("ar"), label }));
}

function storeMatchesCategory(store: Store, key: string) {
  if (
    categoryLabel(store.category).toLocaleLowerCase("ar") === key
  ) {
    return true;
  }
  return (store.menuItems || []).some(
    (item) => categoryLabel(item.category).toLocaleLowerCase("ar") === key,
  );
}

export function HomepageExperience({ stores }: { stores: Store[] }) {
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState("");
  const [location, setLocation] = useState<CustomerLocation | null>(null);
  const [locationError, setLocationError] = useState("");
  const [locationLoading, setLocationLoading] = useState(false);

  const categories = useMemo(() => categoryOptions(stores), [stores]);
  const normalizedSearch = search.trim().toLocaleLowerCase("ar");

  const matches = useMemo(() => {
    const selectedStores = stores.filter((store) => {
      const matchesCategory =
        !activeCategory || storeMatchesCategory(store, activeCategory);
      if (!matchesCategory || !normalizedSearch) return matchesCategory;
      const storeText = `${store.name} ${store.description || ""}`.toLocaleLowerCase(
        "ar",
      );
      const productText = (store.menuItems || [])
        .map((item) => `${productName(item)} ${item.description || ""}`)
        .join(" ")
        .toLocaleLowerCase("ar");
      return `${storeText} ${productText}`.includes(normalizedSearch);
    });

    const products: ProductResult[] = [];
    if (normalizedSearch) {
      for (const store of stores) {
        if (activeCategory && !storeMatchesCategory(store, activeCategory)) {
          continue;
        }
        for (const product of store.menuItems || []) {
          if (
            activeCategory &&
            categoryLabel(product.category).toLocaleLowerCase("ar") !==
              activeCategory
          ) {
            continue;
          }
          const searchableText =
            `${productName(product)} ${product.description || ""}`.toLocaleLowerCase(
              "ar",
            );
          if (searchableText.includes(normalizedSearch)) {
            products.push({ store, product });
          }
        }
      }
    }

    return { stores: selectedStores, products };
  }, [stores, activeCategory, normalizedSearch]);

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

  const nearbyStores = useMemo(() => {
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
          return { store, distance: null };
        }
        return {
          store,
          distance: distanceBetween(location, { latitude, longitude }),
        };
      })
      .filter(
        (result): result is { store: Store; distance: number } =>
          result.distance !== null,
      )
      .sort((first, second) => first.distance - second.distance)
      .slice(0, 4);
  }, [location, stores]);

  function requestLocation() {
    if (!navigator.geolocation) {
      setLocationError("المتصفح لا يدعم تحديد الموقع.");
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
            ? "لم يتم السماح بالوصول إلى موقعك."
            : "تعذر تحديد موقعك الآن. حاول مرة أخرى.",
        );
        setLocationLoading(false);
      },
      { enableHighAccuracy: false, timeout: 12000, maximumAge: 300000 },
    );
  }

  return (
    <>
      <section className={styles.discovery} aria-label="البحث والتصنيفات">
        <label className={styles.search}>
          <span aria-hidden="true">⌕</span>
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="ابحث عن متجر أو منتج"
            aria-label="ابحث عن متجر أو منتج"
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch("")}
              aria-label="مسح البحث"
            >
              ×
            </button>
          )}
        </label>

        {categories.length > 0 && (
          <div className={styles.categoryBlock}>
            <div className={styles.categoryHeading}>
              <div>
                <p className={styles.eyebrow}>تصفح أسرع</p>
                <h2>التصنيفات</h2>
              </div>
              <span>{categories.length} تصنيف</span>
            </div>
            <div className={styles.categoryList} aria-label="تصفية حسب التصنيف">
              <button
                className={!activeCategory ? styles.selectedCategory : ""}
                type="button"
                onClick={() => setActiveCategory("")}
                aria-pressed={!activeCategory}
              >
                الكل
              </button>
              {categories.map((category) => (
                <button
                  className={
                    activeCategory === category.key ? styles.selectedCategory : ""
                  }
                  key={category.key}
                  type="button"
                  onClick={() => setActiveCategory(category.key)}
                  aria-pressed={activeCategory === category.key}
                >
                  {category.label}
                </button>
              ))}
            </div>
          </div>
        )}
      </section>

      {!normalizedSearch && !activeCategory && featuredStores.length > 0 && (
        <section className={styles.section} aria-labelledby="featured-title">
          <div className={styles.sectionHeading}>
            <div>
              <p className={styles.eyebrow}>اختيارات العملاء</p>
              <h2 id="featured-title">الأعلى تقييمًا</h2>
            </div>
            <span>حسب تقييمات العملاء</span>
          </div>
          <div className={styles.storeGrid}>
            {featuredStores.map((store) => (
              <StoreCard key={store.id} store={store} />
            ))}
          </div>
        </section>
      )}

      <section className={styles.nearbySection} aria-labelledby="nearby-title">
        <div className={styles.sectionHeading}>
          <div>
            <p className={styles.eyebrow}>قريبة منك</p>
            <h2 id="nearby-title">متاجر بالقرب منك</h2>
          </div>
          <button
            className={styles.locationButton}
            type="button"
            onClick={requestLocation}
            disabled={locationLoading}
          >
            {locationLoading
              ? "جارٍ تحديد الموقع…"
              : location
                ? "تحديث موقعي"
                : "استخدم موقعي"}
          </button>
        </div>
        {locationError && (
          <p className={styles.locationError} role="alert">
            {locationError}
          </p>
        )}
        {location ? (
          nearbyStores.length > 0 ? (
            <div className={styles.storeGrid}>
              {nearbyStores.map(({ store, distance }) => (
                <StoreCard
                  key={store.id}
                  store={store}
                  distanceKm={distance}
                />
              ))}
            </div>
          ) : (
            <p className={styles.unavailable}>
              لا توجد متاجر بإحداثيات متاحة لترتيبها حسب المسافة.
            </p>
          )
        ) : (
          <p className={styles.locationHint}>
            اسمح بالوصول إلى الموقع لعرض أقرب المتاجر. تُحسب المسافة بخط مستقيم
            من موقعك، وليست تقديرًا لوقت الطريق.
          </p>
        )}
      </section>

      <section className={styles.section} id="stores" aria-labelledby="stores-title">
        <div className={styles.sectionHeading}>
          <div>
            <p className={styles.eyebrow}>
              {normalizedSearch ? "نتائج البحث" : "اختار اللي على مزاجك"}
            </p>
            <h2 id="stores-title">
              {normalizedSearch
                ? "المتاجر والمنتجات"
                : activeCategory
                  ? "متاجر التصنيف"
                  : "متاجر متاحة الآن"}
            </h2>
          </div>
          <span>
            {matches.stores.length} متجر
            {normalizedSearch ? ` · ${matches.products.length} منتج` : ""}
          </span>
        </div>

        {normalizedSearch && matches.products.length > 0 && (
          <div className={styles.searchProducts}>
            <h3>منتجات مطابقة</h3>
            <div className={styles.productGrid}>
              {matches.products.slice(0, 8).map(({ store, product }) => (
                <div className={styles.productResult} key={`${store.id}-${product.id}`}>
                  <ProductCard storeId={store.id} product={product} />
                  <Link
                    className={styles.productStore}
                    href={`/stores/${store.id}`}
                  >
                    من متجر {store.name}
                  </Link>
                </div>
              ))}
            </div>
          </div>
        )}

        {matches.stores.length > 0 ? (
          <div className={styles.storeGrid}>
            {matches.stores.map((store) => (
              <StoreCard key={store.id} store={store} />
            ))}
          </div>
        ) : matches.products.length === 0 ? (
          <div className={styles.emptyState}>
            <h3>لا توجد نتائج مطابقة</h3>
            <p>جرّب اسمًا آخر أو اختر تصنيفًا مختلفًا.</p>
          </div>
        ) : null}
      </section>
    </>
  );
}

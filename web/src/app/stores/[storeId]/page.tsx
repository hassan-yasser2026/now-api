import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { CartLink } from "@/components/cart-link";
import {
  getSafeImageUrl,
  getStore,
  getStoreMenu,
  type MenuItem,
} from "@/lib/api";
import { ProductCard } from "@/components/product-card";
import styles from "./store-page.module.css";

type StorePageProps = {
  params: Promise<{ storeId: string }>;
};

async function loadStorePage(storeId: string) {
  const id = Number(storeId);
  if (!Number.isSafeInteger(id) || id <= 0) return null;

  const store = await getStore(id);
  if (!store) return null;

  const menu = await getStoreMenu(id);
  return { store, menu };
}

export async function generateMetadata({
  params,
}: StorePageProps): Promise<Metadata> {
  const { storeId } = await params;
  const id = Number(storeId);
  if (!Number.isSafeInteger(id) || id <= 0) return { title: "المتجر غير موجود" };

  try {
    const store = await getStore(id);
    if (!store) return { title: "المتجر غير موجود" };
    const imageUrl = getSafeImageUrl(store.image);

    return {
      title: store.name,
      description:
        store.description || `تصفح منتجات ${store.name} واطلبها أونلاين من NOW.`,
      openGraph: {
        title: `${store.name} | NOW`,
        description:
          store.description || `تصفح منتجات ${store.name} واطلبها أونلاين.`,
        images: imageUrl ? [{ url: imageUrl }] : undefined,
        type: "website",
      },
    };
  } catch (error) {
    console.error("Failed to load store metadata:", error);
    return { title: "متجر NOW" };
  }
}

function selectProducts(menu: MenuItem[]) {
  return menu.filter((item) => item.isAvailable);
}

export default async function StorePage({ params }: StorePageProps) {
  await connection();
  const { storeId } = await params;

  let storePage: Awaited<ReturnType<typeof loadStorePage>> | undefined;
  let loadError = false;
  try {
    storePage = await loadStorePage(storeId);
  } catch (error) {
    console.error("Failed to load store for the customer website:", error);
    loadError = true;
  }

  if (loadError) {
    return (
      <main className={styles.errorState} role="alert">
        <h1>تعذر تحميل المتجر</h1>
        <p>حصلت مشكلة في الاتصال بخدمة NOW. حاول مرة أخرى.</p>
        <Link href="/">العودة للمتاجر</Link>
      </main>
    );
  }

  if (!storePage) notFound();

  const { store, menu } = storePage;
  const products = selectProducts(menu);
  const imageUrl = getSafeImageUrl(store.image);

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <Link className={styles.brand} href="/">
          NOW
        </Link>
        <Link className={styles.backLink} href="/">
          كل المتاجر
        </Link>
        <CartLink />
      </header>

      <section className={styles.storeHero}>
        <div className={styles.storeImage}>
          {imageUrl ? (
            <Image
              src={imageUrl}
              alt={`صورة متجر ${store.name}`}
              fill
              priority
              sizes="(max-width: 700px) 100vw, 420px"
              unoptimized
            />
          ) : (
            <span aria-hidden="true">{store.name.slice(0, 1)}</span>
          )}
        </div>
        <div className={styles.storeIntro}>
          <p className={styles.eyebrow}>متجر على NOW</p>
          <h1>{store.name}</h1>
          <p className={styles.description}>
            {store.description || "تصفح المنتجات المتاحة واطلبها أونلاين."}
          </p>
          <div className={styles.storeFacts}>
            <span className={store.isOpen ? styles.open : styles.closed}>
              {store.isOpen ? "مفتوح الآن" : "مغلق حاليًا"}
            </span>
            {Number(store.ratingAverage) > 0 && (
              <span>★ {Number(store.ratingAverage).toFixed(1)}</span>
            )}
          </div>
        </div>
      </section>

      <section className={styles.menuSection} aria-labelledby="menu-title">
        <div className={styles.menuHeading}>
          <div>
            <p className={styles.eyebrow}>اختار طلبك</p>
            <h2 id="menu-title">قائمة المنتجات</h2>
          </div>
          <span>{products.length} منتج</span>
        </div>
        {products.length > 0 ? (
          <div className={styles.productGrid}>
            {products.map((product) => (
              <ProductCard key={product.id} storeId={store.id} product={product} />
            ))}
          </div>
        ) : (
          <div className={styles.emptyState}>
            لا توجد منتجات متاحة في هذا المتجر حاليًا.
          </div>
        )}
      </section>
    </main>
  );
}

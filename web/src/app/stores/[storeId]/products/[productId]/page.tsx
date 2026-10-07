import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { AddToCartButton } from "@/components/add-to-cart-button";
import { CartLink } from "@/components/cart-link";
import {
  formatPrice,
  getSafeImageUrl,
  getStore,
  getStoreMenu,
} from "@/lib/api";
import styles from "./product-page.module.css";

type ProductPageProps = {
  params: Promise<{ storeId: string; productId: string }>;
};

async function loadProductPage(storeId: string, productId: string) {
  const storeIdNumber = Number(storeId);
  const productIdNumber = Number(productId);
  if (
    !Number.isSafeInteger(storeIdNumber) ||
    storeIdNumber <= 0 ||
    !Number.isSafeInteger(productIdNumber) ||
    productIdNumber <= 0
  ) {
    return null;
  }

  const [store, menu] = await Promise.all([
    getStore(storeIdNumber),
    getStoreMenu(storeIdNumber),
  ]);
  if (!store) return null;

  const product = menu.find(
    (item) => item.id === productIdNumber && item.isAvailable,
  );
  if (!product) return null;

  return { store, product };
}

export async function generateMetadata({
  params,
}: ProductPageProps): Promise<Metadata> {
  const { storeId, productId } = await params;

  try {
    const result = await loadProductPage(storeId, productId);
    if (!result) return { title: "المنتج غير موجود" };
    const { store, product } = result;
    const name = product.nameAr || product.name;
    const imageUrl = getSafeImageUrl(product.image);

    return {
      title: `${name} من ${store.name}`,
      description:
        product.description ||
        `اطلب ${name} من ${store.name} أونلاين مع NOW بسعر ${formatPrice(product.price)}.`,
      openGraph: {
        title: `${name} | ${store.name} - NOW`,
        description:
          product.description || `اطلب ${name} أونلاين من ${store.name}.`,
        images: imageUrl ? [{ url: imageUrl }] : undefined,
        type: "website",
      },
    };
  } catch (error) {
    console.error("Failed to load product metadata:", error);
    return { title: "منتج NOW" };
  }
}

export default async function ProductPage({ params }: ProductPageProps) {
  await connection();
  const { storeId, productId } = await params;

  let productPage: Awaited<ReturnType<typeof loadProductPage>> | undefined;
  let loadError = false;
  try {
    productPage = await loadProductPage(storeId, productId);
  } catch (error) {
    console.error("Failed to load product for the customer website:", error);
    loadError = true;
  }

  if (loadError) {
    return (
      <main className={styles.errorState} role="alert">
        <h1>تعذر تحميل المنتج</h1>
        <p>حصلت مشكلة في الاتصال بخدمة NOW. حاول مرة أخرى.</p>
        <Link href="/">العودة للمتاجر</Link>
      </main>
    );
  }

  if (!productPage) notFound();

  const { store, product } = productPage;
  const imageUrl = getSafeImageUrl(product.image);
  const productName = product.nameAr || product.name;
  const categoryName = product.category?.nameAr || product.category?.name;
  const rating = Number(product.averageRating || 0);
  const ratingCount = Number(product.ratingsCount || 0);
  const originalPrice = Number(product.originalPrice || product.price);
  const currentPrice = Number(product.price);
  const hasDiscount =
    Number.isFinite(originalPrice) && originalPrice > currentPrice;
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: productName,
    description: product.description || undefined,
    image: imageUrl || undefined,
    sku: String(product.id),
    category: categoryName || undefined,
    offers: {
      "@type": "Offer",
      price: currentPrice,
      priceCurrency: "EGP",
      availability: "https://schema.org/InStock",
      url: `${process.env.NEXT_PUBLIC_SITE_URL || "https://now-eg.com"}/stores/${store.id}/products/${product.id}`,
    },
    ...(ratingCount > 0 && rating > 0
      ? {
          aggregateRating: {
            "@type": "AggregateRating",
            ratingValue: rating,
            reviewCount: ratingCount,
          },
        }
      : {}),
  };

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <Link className={styles.brand} href="/">
          NOW
        </Link>
        <Link className={styles.backLink} href={`/stores/${store.id}`}>
          الرجوع إلى {store.name}
        </Link>
        <CartLink />
      </header>

      <article className={styles.product}>
        <div className={styles.image}>
          {imageUrl ? (
            <Image
              src={imageUrl}
              alt={`صورة ${productName}`}
              fill
              priority
              sizes="(max-width: 700px) 100vw, 50vw"
              unoptimized
            />
          ) : (
            <span aria-hidden="true">{productName.slice(0, 1)}</span>
          )}
        </div>
        <div className={styles.details}>
          <p className={styles.storeName}>{store.name}</p>
          {categoryName && <p className={styles.category}>{categoryName}</p>}
          <h1>{productName}</h1>
          <p className={styles.description}>
            {product.description || "لا يوجد وصف إضافي لهذا المنتج."}
          </p>
          <div className={styles.priceRow}>
            <p className={styles.price}>{formatPrice(product.price)}</p>
            {hasDiscount && (
              <p className={styles.originalPrice}>
                {formatPrice(originalPrice)}
              </p>
            )}
            {Number(product.discountPercentage) > 0 && (
              <span className={styles.discount}>
                خصم {Number(product.discountPercentage)}٪
              </span>
            )}
          </div>
          <div className={styles.productFacts}>
            <span className={styles.available}>متاح للطلب</span>
            {ratingCount > 0 && rating > 0 ? (
              <span className={styles.rating}>
                ★ {rating.toFixed(1)} ({ratingCount} تقييم)
              </span>
            ) : (
              <span className={styles.noRating}>لا توجد تقييمات بعد</span>
            )}
          </div>
          <div className={styles.actions}>
            <AddToCartButton store={{ id: store.id, name: store.name }} product={product} />
            <Link className={styles.backButton} href={`/stores/${store.id}`}>
              استكشف منتجات المتجر
            </Link>
          </div>
        </div>
      </article>

      {Array.isArray(product.ratingDetails) &&
        product.ratingDetails.some((review) => review.comment) && (
          <section className={styles.reviews} aria-labelledby="reviews-title">
            <h2 id="reviews-title">آراء العملاء</h2>
            <div className={styles.reviewList}>
              {product.ratingDetails
                .filter((review) => review.comment)
                .slice(0, 5)
                .map((review, index) => (
                  <article
                    className={styles.review}
                    key={`${review.createdAt || "review"}-${index}`}
                  >
                    <strong>{review.customerName || "عميل NOW"}</strong>
                    <span>★ {review.stars}/5</span>
                    <p>{review.comment}</p>
                  </article>
                ))}
            </div>
          </section>
        )}

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(structuredData).replace(/</g, "\\u003c"),
        }}
      />
    </main>
  );
}

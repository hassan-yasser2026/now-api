import type { Metadata } from "next";
import Image from "next/image";
import { Link } from "@/i18n/navigation";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { getTranslations } from "next-intl/server";
import { AddToCartButton } from "@/components/add-to-cart-button";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { CustomerNavbar } from "@/components/customer-navbar";
import { HomepageFooter } from "@/components/homepage-footer";
import {
  formatPrice,
  getOpenGraphImageUrl,
  getSafeImageUrl,
  getStore,
  getStoreMenu,
  shouldUnoptimizeImage,
} from "@/lib/api";
import { getSiteUrl } from "@/lib/site-url";

type ProductPageProps = {
  params: Promise<{ locale: string; storeId: string; productId: string }>;
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
  const { locale, storeId, productId } = await params;
  const t = await getTranslations({ locale, namespace: "product" });

  try {
    const result = await loadProductPage(storeId, productId);
    if (!result) return { title: t("notFound") };
    const { store, product } = result;
    const name =
      locale === "en" ? product.name : product.nameAr || product.name;
    const pathname = `/stores/${store.id}/products/${product.id}`;
    const localizedPath = locale === "ar" ? pathname : `/en${pathname}`;

    return {
      title: t("metadataTitle", { name, store: store.name }),
      description:
        product.description ||
        t("metadataDescription", {
          name,
          store: store.name,
          price: formatPrice(product.price, locale),
        }),
      alternates: {
        canonical: localizedPath,
        languages: { ar: pathname, en: `/en${pathname}` },
      },
      openGraph: {
        title: `${name} | ${store.name} - Goody Star`,
        description:
          product.description ||
          t("metadataShortDescription", { name, store: store.name }),
        images: [{ url: getOpenGraphImageUrl(product.image) }],
        type: "website",
        url: new URL(
          localizedPath,
          getSiteUrl(),
        ).toString(),
      },
    };
  } catch (error) {
    console.error("Failed to load product metadata:", error);
    return { title: t("metadataFallback") };
  }
}

export default async function ProductPage({ params }: ProductPageProps) {
  await connection();
  const { locale, storeId, productId } = await params;
  const t = await getTranslations("product");
  const common = await getTranslations("common");

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
      <>
        <CustomerNavbar />
        <main className="mx-auto grid min-h-[55vh] w-[min(680px,calc(100%-32px))] content-center text-center">
          <section className="rounded-3xl border border-now-900/[0.06] bg-white px-6 py-12 shadow-[0_14px_36px_rgba(29,63,52,0.08)] sm:px-10 sm:py-16" role="alert">
            <h1 className="text-2xl font-black text-now-900">{t("errorTitle")}</h1>
            <p className="mt-3 text-sm leading-7 text-now-700">
              {t("errorDescription")}
            </p>
            <Link className="mt-6 inline-flex min-h-12 items-center justify-center rounded-xl bg-now-600 px-6 font-extrabold text-white transition hover:bg-now-700" href="/">
              {t("backToStores")}
            </Link>
          </section>
        </main>
        <HomepageFooter />
      </>
    );
  }

  if (!productPage) notFound();

  const { store, product } = productPage;
  const imageUrl = getSafeImageUrl(product.image);
  const productName =
    locale === "en" ? product.name : product.nameAr || product.name;
  const categoryName =
    locale === "en"
      ? product.category?.name || product.category?.nameAr
      : product.category?.nameAr || product.category?.name;
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
    image: new URL(
      getOpenGraphImageUrl(product.image),
      getSiteUrl(),
    ).toString(),
    sku: String(product.id),
    category: categoryName || undefined,
    offers: {
      "@type": "Offer",
      price: currentPrice,
      priceCurrency: "EGP",
      availability: "https://schema.org/InStock",
      url: new URL(
        `${locale === "ar" ? "" : "/en"}/stores/${store.id}/products/${product.id}`,
        getSiteUrl(),
      ).toString(),
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
    <>
      <CustomerNavbar />
      <main className="mx-auto min-h-screen w-[min(1200px,calc(100%-32px))] sm:w-[min(1200px,calc(100%-48px))]">
        <Breadcrumbs
          items={[
            { label: common("home"), href: "/" },
            { label: common("stores"), href: "/#stores" },
            { label: store.name, href: `/stores/${store.id}` },
            { label: productName },
          ]}
        />

        <article className="grid overflow-hidden rounded-[28px] border border-now-900/[0.06] bg-white shadow-[0_18px_55px_rgba(24,51,45,0.08)] sm:rounded-[36px] lg:grid-cols-2">
          <div className="relative order-1 aspect-square max-h-[620px] overflow-hidden bg-gradient-to-br from-now-100 via-emerald-50 to-now-100 lg:order-2">
            {imageUrl ? (
              <Image
                src={imageUrl}
                alt={t("imageAlt", { name: productName })}
                className="object-cover"
                fetchPriority="high"
                fill
                preload
                sizes="(max-width: 1023px) 100vw, 50vw"
                unoptimized={shouldUnoptimizeImage(imageUrl)}
              />
            ) : (
              <div className="absolute inset-0 grid place-items-center bg-[radial-gradient(circle_at_25%_25%,rgba(255,255,255,.9),transparent_40%),linear-gradient(135deg,#ddf3e8,#afdcc8)]">
                <span className="grid size-40 place-items-center rounded-[2.5rem] border border-white/80 bg-white/55 text-7xl font-black text-now-600 shadow-xl backdrop-blur sm:size-52 sm:text-8xl">
                  {productName.slice(0, 1)}
                </span>
              </div>
            )}
            {hasDiscount && Number(product.discountPercentage) > 0 && (
              <span className="absolute right-4 top-4 rounded-full bg-now-gold px-4 py-2 text-sm font-black text-now-900 shadow-lg sm:right-6 sm:top-6">
                {t("discount", { percentage: Number(product.discountPercentage) })}
              </span>
            )}
            {ratingCount > 0 && rating > 0 && (
              <span className="absolute bottom-4 right-4 inline-flex min-h-11 items-center gap-2 rounded-xl border border-white/70 bg-white/95 px-4 text-sm font-extrabold text-amber-800 shadow-lg sm:bottom-6 sm:right-6">
                <span aria-hidden="true">★</span> {rating.toFixed(1)}
                <span className="text-xs font-semibold text-now-700">
                  {t("ratingCount", { count: ratingCount })}
                </span>
              </span>
            )}
          </div>

          <div className="order-2 flex flex-col justify-center p-5 sm:p-8 lg:order-1 lg:p-12">
            <Link
              className="inline-flex min-h-10 w-fit items-center gap-2 rounded-full bg-now-50 px-4 text-xs font-extrabold text-now-700 transition hover:bg-now-100 sm:text-sm"
              href={`/stores/${store.id}`}
            >
              <span aria-hidden="true">←</span>
              {store.name}
            </Link>
            {categoryName && (
              <p className="mt-5 text-xs font-extrabold text-now-600 sm:mt-7 sm:text-sm">
                {categoryName}
              </p>
            )}
            <h1 className="mt-2 text-3xl font-black leading-tight tracking-tight text-now-900 sm:text-4xl lg:text-5xl">
              {productName}
            </h1>
            <p className="mt-4 text-sm leading-7 text-now-700 sm:text-base sm:leading-8">
              {product.description || t("noDescription")}
            </p>

            <div className="mt-6 flex flex-wrap items-center gap-x-3 gap-y-2 border-y border-now-900/[0.06] py-5">
              <p className="text-2xl font-black text-now-700 sm:text-3xl">
                {formatPrice(product.price, locale)}
              </p>
              {hasDiscount && (
                <p className="text-sm font-bold text-now-700 line-through sm:text-base">
                  {formatPrice(originalPrice, locale)}
                </p>
              )}
              {Number(product.discountPercentage) > 0 && (
                <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-extrabold text-amber-800">
                  {t("discountPrompt")}
                </span>
              )}
            </div>

            <div className="mt-5 flex flex-wrap items-center gap-3 text-xs font-bold sm:text-sm">
              <span className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-emerald-50 px-3 text-emerald-800">
                <span className="size-2 rounded-full bg-emerald-500" />
                {t("available")}
              </span>
              {ratingCount > 0 && rating > 0 ? (
                <span className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-amber-50 px-3 text-amber-800">
                  <span aria-hidden="true">★</span>
                  {rating.toFixed(1)} ({t("ratingCount", { count: ratingCount })})
                </span>
              ) : (
                <span className="inline-flex min-h-10 items-center rounded-xl bg-now-50 px-3 text-now-700">
                  {t("noRatings")}
                </span>
              )}
            </div>

            <div className="mt-7 grid gap-3 sm:mt-8 sm:grid-cols-2">
              <AddToCartButton
                store={{ id: store.id, name: store.name }}
                product={product}
              />
              <Link
                className="inline-flex min-h-12 items-center justify-center rounded-xl border border-now-600/25 bg-white px-5 text-sm font-extrabold text-now-700 transition hover:border-now-600 hover:bg-now-50 sm:min-h-14"
                href={`/stores/${store.id}`}
              >
                {t("exploreStore")}
              </Link>
            </div>
          </div>
        </article>

        {Array.isArray(product.ratingDetails) &&
          product.ratingDetails.some((review) => review.comment) && (
            <section className="pb-16 pt-12 sm:pb-20 sm:pt-16" aria-labelledby="reviews-title">
              <div className="mb-6">
                <p className="text-xs font-extrabold text-now-600 sm:text-sm">{t("customerExperiences")}</p>
                <h2 className="mt-1 text-2xl font-black text-now-900 sm:text-3xl" id="reviews-title">
                  {t("customerReviews")}
                </h2>
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {product.ratingDetails
                  .filter((review) => review.comment)
                  .slice(0, 5)
                  .map((review, index) => (
                    <article
                      className="grid content-start gap-3 rounded-2xl border border-now-900/[0.06] bg-white p-5 shadow-sm"
                      key={`${review.createdAt || "review"}-${index}`}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <strong className="text-sm font-extrabold text-now-900">
                          {review.customerName || t("customerFallback")}
                        </strong>
                        <span className="rounded-lg bg-amber-50 px-2 py-1 text-xs font-extrabold text-amber-800">
                          ★ {review.stars}/5
                        </span>
                      </div>
                      <p className="text-sm leading-7 text-now-700">
                        {review.comment}
                      </p>
                    </article>
                  ))}
              </div>
            </section>
          )}
      </main>
      <HomepageFooter />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(structuredData).replace(/</g, "\\u003c"),
        }}
      />
    </>
  );
}

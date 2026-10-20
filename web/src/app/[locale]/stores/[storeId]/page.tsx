import type { Metadata } from "next";
import Image from "next/image";
import { Link } from "@/i18n/navigation";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { getTranslations } from "next-intl/server";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { CustomerNavbar } from "@/components/customer-navbar";
import { HomepageFooter } from "@/components/homepage-footer";
import { StoreCatalog } from "@/components/store-catalog";
import {
  getOpenGraphImageUrl,
  getSafeImageUrl,
  getStore,
  getStoreMenu,
  shouldUnoptimizeImage,
} from "@/lib/api";
import { getSiteUrl } from "@/lib/site-url";

type StorePageProps = {
  params: Promise<{ locale: string; storeId: string }>;
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
  const { locale, storeId } = await params;
  const t = await getTranslations({ locale, namespace: "store" });
  const id = Number(storeId);
  if (!Number.isSafeInteger(id) || id <= 0) return { title: t("notFound") };

  try {
    const store = await getStore(id);
    if (!store) return { title: t("notFound") };
    const pathname = `/stores/${store.id}`;
    const localizedPath = locale === "ar" ? pathname : `/en${pathname}`;
    return {
      title: store.name,
      description:
        store.description || t("metadataDescription", { name: store.name }),
      alternates: {
        canonical: localizedPath,
        languages: { ar: pathname, en: `/en${pathname}` },
      },
      openGraph: {
        title: `${store.name} | Goody Star`,
        description:
          store.description || t("metadataDescription", { name: store.name }),
        images: [{ url: getOpenGraphImageUrl(store.image) }],
        type: "website",
        url: new URL(localizedPath, getSiteUrl()).toString(),
      },
    };
  } catch (error) {
    console.error("Failed to load store metadata:", error);
    return { title: t("metadataFallback") };
  }
}

export default async function StorePage({ params }: StorePageProps) {
  await connection();
  const { locale, storeId } = await params;
  const t = await getTranslations("store");
  const common = await getTranslations("common");

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

  if (!storePage) notFound();

  const { store, menu } = storePage;
  const products = menu;
  const availableProductCount = products.filter(
    (item) => item.isAvailable,
  ).length;
  const imageUrl = getSafeImageUrl(store.image);
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "Store",
    name: store.name,
    description: store.description || undefined,
    image: new URL(getOpenGraphImageUrl(store.image), getSiteUrl()).toString(),
    url: new URL(
      `${locale === "ar" ? "" : "/en"}/stores/${store.id}`,
      getSiteUrl(),
    ).toString(),
    ...(Number(store.ratingAverage) > 0 && Number(store.ratingCount) > 0
      ? {
          aggregateRating: {
            "@type": "AggregateRating",
            ratingValue: Number(store.ratingAverage),
            reviewCount: Number(store.ratingCount),
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
            { label: store.name },
          ]}
        />

        <section
          className="flex items-center gap-3 rounded-[20px] border border-now-900/[0.06] bg-white p-3 shadow-[0_4px_18px_rgba(24,51,45,0.06)] sm:gap-4 sm:p-4"
          dir={locale === "ar" ? "rtl" : "ltr"}
        >
          <div className="relative size-[72px] shrink-0 overflow-hidden rounded-2xl bg-gradient-to-br from-now-100 to-emerald-50 sm:size-20">
            {imageUrl ? (
              <Image
                src={imageUrl}
                alt={t("imageAlt", { name: store.name })}
                className="object-cover"
                fill
                sizes="80px"
                unoptimized={shouldUnoptimizeImage(imageUrl)}
              />
            ) : (
              <span className="absolute inset-0 grid place-items-center text-3xl font-black text-now-600">
                {store.name.slice(0, 1)}
              </span>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="truncate text-lg font-black text-now-900 sm:text-xl">
                {store.name}
              </h1>
              <span className={`inline-flex min-h-7 shrink-0 items-center gap-1.5 rounded-full px-2.5 text-[10px] font-extrabold sm:text-xs ${store.isOpen ? "bg-emerald-50 text-emerald-800" : "bg-now-50 text-now-700"}`}>
                <span className={`size-1.5 rounded-full ${store.isOpen ? "bg-emerald-500" : "bg-now-900/35"}`} />
                {store.isOpen ? t("open") : t("closed")}
              </span>
            </div>
            <p className="mt-1 line-clamp-2 text-xs leading-5 text-now-700 sm:text-sm">
              {store.description || t("browseDescription")}
            </p>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              {Number(store.ratingAverage) > 0 && (
                <span className="inline-flex items-center gap-1 rounded-lg bg-amber-50 px-2 py-1 text-[10px] font-extrabold text-amber-800">
                  ★ {Number(store.ratingAverage).toFixed(1)}
                </span>
              )}
              <span className="inline-flex items-center rounded-lg bg-now-50 px-2 py-1 text-[10px] font-bold text-now-700">
                {t("availableProductCount", { count: availableProductCount })}
              </span>
            </div>
          </div>
        </section>

        <section className="pb-16 pt-7 sm:pb-20 sm:pt-9" id="menu">
          <div className="mb-4 flex items-end justify-between gap-3 sm:mb-5">
            <div>
              <p className="text-xs font-extrabold text-now-600 sm:text-sm">{t("chooseOrder")}</p>
              <h2 className="mt-1 text-2xl font-black tracking-tight text-now-900 sm:text-3xl">
                {t("productList")}
              </h2>
            </div>
            <span className="pb-1 text-xs font-bold text-now-700 sm:text-sm">
              {t("availableProductCount", { count: availableProductCount })}
            </span>
          </div>
          <StoreCatalog
            storeId={store.id}
            storeName={store.name}
            products={products}
          />
        </section>
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

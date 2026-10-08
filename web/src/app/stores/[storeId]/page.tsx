import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
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
    return {
      title: store.name,
      description:
        store.description || `تصفح منتجات ${store.name} واطلبها أونلاين من NOW.`,
      alternates: { canonical: `/stores/${store.id}` },
      openGraph: {
        title: `${store.name} | NOW`,
        description:
          store.description || `تصفح منتجات ${store.name} واطلبها أونلاين.`,
        images: [{ url: getOpenGraphImageUrl(store.image) }],
        type: "website",
        url: new URL(`/stores/${store.id}`, getSiteUrl()).toString(),
      },
    };
  } catch (error) {
    console.error("Failed to load store metadata:", error);
    return { title: "متجر NOW" };
  }
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
      <>
        <CustomerNavbar />
        <main className="mx-auto grid min-h-[55vh] w-[min(680px,calc(100%-32px))] content-center text-center">
          <section className="rounded-3xl border border-now-900/[0.06] bg-white px-6 py-12 shadow-[0_14px_36px_rgba(29,63,52,0.08)] sm:px-10 sm:py-16" role="alert">
            <h1 className="text-2xl font-black text-now-900">تعذر تحميل المتجر</h1>
            <p className="mt-3 text-sm leading-7 text-now-700">
              حصلت مشكلة في الاتصال بخدمة NOW. حاول مرة أخرى.
            </p>
            <Link className="mt-6 inline-flex min-h-12 items-center justify-center rounded-xl bg-now-600 px-6 font-extrabold text-white transition hover:bg-now-700" href="/">
              العودة للمتاجر
            </Link>
          </section>
        </main>
        <HomepageFooter />
      </>
    );
  }

  if (!storePage) notFound();

  const { store, menu } = storePage;
  const products = menu.filter((item) => item.isAvailable);
  const imageUrl = getSafeImageUrl(store.image);
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "Store",
    name: store.name,
    description: store.description || undefined,
    image: new URL(getOpenGraphImageUrl(store.image), getSiteUrl()).toString(),
    url: new URL(`/stores/${store.id}`, getSiteUrl()).toString(),
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
            { label: "الرئيسية", href: "/" },
            { label: "المتاجر", href: "/#stores" },
            { label: store.name },
          ]}
        />

        <section className="relative isolate grid overflow-hidden rounded-[28px] border border-now-900/[0.05] bg-white shadow-[0_18px_55px_rgba(24,51,45,0.08)] sm:rounded-[36px] lg:min-h-[360px] lg:grid-cols-[.9fr_1.1fr]">
          <div className="relative order-1 min-h-56 overflow-hidden bg-gradient-to-br from-now-100 via-emerald-50 to-now-100 sm:min-h-72 lg:order-2 lg:min-h-[360px]">
            {imageUrl ? (
              <Image
                src={imageUrl}
                alt={`صورة متجر ${store.name}`}
                className="object-cover"
                fill
                sizes="(max-width: 1023px) 100vw, 55vw"
                unoptimized={shouldUnoptimizeImage(imageUrl)}
              />
            ) : (
              <div className="absolute inset-0 grid place-items-center bg-[radial-gradient(circle_at_25%_25%,rgba(255,255,255,.9),transparent_40%),linear-gradient(135deg,#ddf3e8,#afdcc8)]">
                <span className="grid size-36 place-items-center rounded-[2.5rem] border border-white/80 bg-white/55 text-7xl font-black text-now-600 shadow-xl backdrop-blur sm:size-44 sm:text-8xl">
                  {store.name.slice(0, 1)}
                </span>
              </div>
            )}
            <div className="absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-now-900/35 to-transparent" />
            <span className={`absolute right-4 top-4 inline-flex min-h-9 items-center gap-2 rounded-full border border-white/70 px-4 text-xs font-extrabold shadow-sm backdrop-blur sm:right-6 sm:top-6 sm:text-sm ${store.isOpen ? "bg-emerald-50/95 text-emerald-800" : "bg-white/95 text-now-900"}`}>
              <span className={`size-2 rounded-full ${store.isOpen ? "bg-emerald-500" : "bg-now-900/35"}`} />
              {store.isOpen ? "مفتوح الآن" : "مغلق حاليًا"}
            </span>
          </div>
          <div className="relative order-2 flex flex-col justify-center p-5 sm:p-8 lg:order-1 lg:p-12">
            <span className="w-fit rounded-full bg-now-50 px-3 py-1.5 text-xs font-extrabold text-now-700">
              متجر على NOW
            </span>
            <h1 className="mt-4 text-3xl font-black leading-tight tracking-tight text-now-900 sm:text-4xl lg:text-5xl">
              {store.name}
            </h1>
            <p className="mt-3 max-w-xl text-sm leading-7 text-now-700 sm:mt-4 sm:text-base sm:leading-8">
              {store.description || "تصفح المنتجات المتاحة واطلبها أونلاين."}
            </p>
            <div className="mt-5 flex flex-wrap items-center gap-3">
              {Number(store.ratingAverage) > 0 && (
                <span className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-amber-50 px-3 text-sm font-extrabold text-amber-800">
                  <span aria-hidden="true">★</span>
                  {Number(store.ratingAverage).toFixed(1)}
                  {Number(store.ratingCount) > 0 && (
                    <span className="text-xs font-semibold text-amber-900">
                      ({Number(store.ratingCount)} تقييم)
                    </span>
                  )}
                </span>
              )}
              <span className="inline-flex min-h-10 items-center rounded-xl bg-now-50 px-3 text-sm font-bold text-now-700">
                {products.length} منتج متاح
              </span>
            </div>
            <a className="mt-6 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-now-600 px-5 text-sm font-extrabold text-white shadow-md shadow-now-600/20 transition hover:-translate-y-0.5 hover:bg-now-700 sm:w-fit sm:px-6" href="#menu">
              تصفح القائمة <span aria-hidden="true">↓</span>
            </a>
          </div>
        </section>

        <section className="pb-16 pt-12 sm:pb-20 sm:pt-16" id="menu">
          <div className="mb-6 flex items-end justify-between gap-3 sm:mb-8">
            <div>
              <p className="text-xs font-extrabold text-now-600 sm:text-sm">اختار طلبك</p>
              <h2 className="mt-1 text-2xl font-black tracking-tight text-now-900 sm:text-3xl">
                قائمة المنتجات
              </h2>
            </div>
            <span className="pb-1 text-xs font-bold text-now-700 sm:text-sm">
              {products.length} منتج
            </span>
          </div>
          <StoreCatalog storeId={store.id} products={products} />
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

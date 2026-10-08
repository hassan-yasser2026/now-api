import type { Metadata } from "next";
import { connection } from "next/server";
import { getLocale, getTranslations } from "next-intl/server";
import { Link as LocalizedLink } from "@/i18n/navigation";
import { CustomerNavbar } from "@/components/customer-navbar";
import { HomepageDiscovery } from "@/components/homepage-discovery";
import { HomepageFooter } from "@/components/homepage-footer";
import { getStores, type Store } from "@/lib/api";
import { getSiteUrl } from "@/lib/site-url";

type HomePageProps = { params: Promise<{ locale: string }> };

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("home");
  const metadataT = await getTranslations("metadata");
  const locale = await getLocale();
  const title = t("title");
  const description = t("description");
  const canonical = locale === "ar" ? "/" : "/en";

  return {
    title,
    description,
    alternates: {
      canonical,
      languages: { ar: "/", en: "/en" },
    },
    openGraph: {
      title,
      description: t("ogDescription"),
      locale: locale === "ar" ? "ar_EG" : "en_US",
      type: "website",
      url: new URL(canonical, getSiteUrl()).toString(),
      images: [{
        url: "/opengraph-image",
        width: 1200,
        height: 630,
        alt: metadataT("brandAlt"),
      }],
    },
  };
}

export default async function HomePage({ params }: HomePageProps) {
  const { locale } = await params;
  const t = await getTranslations("home");
  const common = await getTranslations("common");
  await connection();

  let stores: Store[] = [];
  let loadError = false;

  try {
    stores = await getStores();
  } catch (error) {
    console.error("Failed to load stores for the customer website:", error);
    loadError = true;
  }

  if (loadError) {
    return (
      <>
        <CustomerNavbar />
        <main className="mx-auto grid min-h-[55vh] w-[min(680px,calc(100%-32px))] content-center text-center">
          <section
            className="rounded-3xl border border-now-900/[0.06] bg-white px-6 py-12 shadow-[0_14px_36px_rgba(29,63,52,0.08)] sm:px-10 sm:py-16"
            role="alert"
          >
            <span className="mx-auto grid size-14 place-items-center rounded-2xl bg-amber-50 text-2xl text-amber-700">
              !
            </span>
            <h1 className="mt-5 text-2xl font-black text-now-900">
              {t("loadErrorTitle")}
            </h1>
            <p className="mt-3 text-sm leading-7 text-now-700">
              {t("loadErrorDescription")}
            </p>
            <LocalizedLink
              className="mt-6 inline-flex min-h-12 items-center justify-center rounded-xl bg-now-600 px-6 font-extrabold text-white transition hover:bg-now-700"
              href="/"
            >
              {common("retry")}
            </LocalizedLink>
          </section>
        </main>
        <HomepageFooter />
      </>
    );
  }

  return (
    <>
      <CustomerNavbar />
      <main>
        <section className="relative isolate mx-auto mt-4 grid min-h-[430px] w-[min(1200px,calc(100%-24px))] items-center overflow-hidden rounded-[28px] bg-now-900 px-5 py-12 text-white shadow-[0_28px_70px_rgba(18,107,87,0.2)] sm:mt-6 sm:min-h-[470px] sm:w-[min(1200px,calc(100%-48px))] sm:rounded-[36px] sm:px-10 sm:py-16 lg:min-h-[500px] lg:grid-cols-[1.05fr_.95fr] lg:px-16">
          <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_15%_85%,rgba(244,185,66,.2),transparent_28rem),radial-gradient(ellipse_at_90%_15%,rgba(33,134,110,.65),transparent_34rem),linear-gradient(125deg,#18332d_5%,#105647_58%,#126b57_100%)]" />
          <div aria-hidden="true" className="absolute -left-24 -top-28 -z-10 size-72 rounded-full border border-white/10 sm:left-[4%] sm:top-[-45%] sm:size-[28rem]">
            <span className="absolute inset-8 rounded-full border border-white/10 sm:inset-12" />
            <span className="absolute inset-16 rounded-full border border-white/10 sm:inset-24" />
          </div>
          <div className="relative z-10 max-w-2xl animate-[rise-in_.7s_ease-out_both]">
            <p className="inline-flex min-h-9 items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 text-xs font-extrabold text-now-100 backdrop-blur sm:text-sm">
              <span className="size-2 rounded-full bg-now-gold shadow-[0_0_14px_rgba(244,185,66,.8)]" />
              {t("heroEyebrow")}
            </p>
            <h1 className="mt-5 max-w-xl text-[2.55rem] font-black leading-[1.2] tracking-tight sm:mt-6 sm:text-5xl lg:text-[3.65rem]">
              {t("heroTitle")}
              <span className="mt-1 block text-now-gold">{t("heroTitleAccent")}</span>
            </h1>
            <p className="mt-4 max-w-lg text-sm leading-7 text-white/75 sm:mt-5 sm:text-lg sm:leading-8">
              {t("heroDescription")}
            </p>
            <div className="mt-7 flex flex-col gap-3 sm:mt-9 sm:flex-row">
              <LocalizedLink
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-now-gold px-6 text-sm font-black text-now-900 shadow-lg shadow-black/10 transition duration-200 hover:-translate-y-0.5 hover:bg-amber-300 hover:shadow-xl sm:min-h-14 sm:rounded-2xl sm:px-8 sm:text-base"
                href="#stores"
              >
                {t("discoverStores")}
                <span aria-hidden="true">←</span>
              </LocalizedLink>
              <LocalizedLink
                className="inline-flex min-h-12 items-center justify-center rounded-xl border border-white/25 bg-white/5 px-6 text-sm font-extrabold text-white transition hover:bg-white/10 sm:min-h-14 sm:rounded-2xl sm:px-7 sm:text-base"
                href="/register"
              >
                {t("startAccount")}
              </LocalizedLink>
            </div>
            <div className="mt-7 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs font-semibold text-white/65 sm:mt-9 sm:text-sm">
              <span className="inline-flex items-center gap-2">
                <span className="text-now-gold">✓</span> {t("diverseStores")}
              </span>
              <span className="inline-flex items-center gap-2">
                <span className="text-now-gold">✓</span> {t("simpleOrder")}
              </span>
            </div>
          </div>

          <div aria-hidden="true" className="relative mx-auto mt-8 hidden aspect-square w-full max-w-[390px] place-items-center lg:grid">
            <div className="absolute inset-3 rounded-full border border-white/15" />
            <div className="absolute inset-10 rounded-full border border-white/15" />
            <div className="absolute inset-[4.5rem] rounded-full bg-white/5 blur-2xl" />
            <div className="relative grid size-[66%] rotate-[-7deg] place-items-center rounded-[32%] border border-white/40 bg-gradient-to-br from-white via-now-100 to-now-100 text-now-700 shadow-[0_35px_80px_rgba(0,0,0,.22)]">
              <span className="text-[5.5rem] font-black tracking-[-.12em]">GS</span>
              <span className="absolute -right-7 top-8 grid size-16 place-items-center rounded-2xl bg-now-gold text-3xl shadow-xl">✦</span>
              <span className="absolute -bottom-6 -left-8 grid size-20 place-items-center rounded-3xl border border-white/70 bg-white/95 text-3xl shadow-xl">⌕</span>
            </div>
          </div>
          <div aria-hidden="true" className="absolute -bottom-28 -left-12 size-52 rounded-full bg-now-gold/10 blur-3xl lg:hidden" />
        </section>

        {stores.length > 0 ? (
          <HomepageDiscovery stores={stores} />
        ) : (
          <section
            className="mx-auto mt-14 w-[min(1200px,calc(100%-32px))] scroll-mt-24 pb-16 sm:w-[min(1200px,calc(100%-48px))]"
            id="stores"
          >
            <div className="rounded-3xl border border-now-900/[0.06] bg-white px-6 py-12 text-center shadow-sm sm:py-16">
              <span className="mx-auto grid size-14 place-items-center rounded-2xl bg-now-50 text-2xl text-now-600">
                ◌
              </span>
              <h2 className="mt-4 text-xl font-black text-now-900">
                {t("emptyTitle")}
              </h2>
              <p className="mt-2 text-sm leading-7 text-now-700">
                {t("emptyDescription")}
              </p>
            </div>
          </section>
        )}
      </main>
      <HomepageFooter />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "OnlineStore",
            name: locale === "ar" ? "چودي ستار (Goody Star)" : "Goody Star",
            url: new URL(locale === "ar" ? "/" : "/en", getSiteUrl()).toString(),
            description: t("description"),
            inLanguage: locale === "ar" ? "ar-EG" : "en",
          }).replace(/</g, "\\u003c"),
        }}
      />
    </>
  );
}

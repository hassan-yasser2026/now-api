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
        <section className="relative overflow-hidden bg-now-600 px-4 py-5 text-white shadow-[0_10px_28px_rgba(18,107,87,0.16)] sm:px-6 sm:py-7">
          <div aria-hidden="true" className="absolute -left-10 -top-16 size-48 rounded-full border border-white/10 sm:left-8 sm:size-56" />
          <div className="relative mx-auto w-[min(1200px,100%)]">
            <p className="text-xs font-black tracking-[0.16em] text-now-gold sm:text-sm">
              {t("appGreeting")}
            </p>
            <h1 className="mt-2 text-xl font-black sm:text-2xl">
              {t("appDescription")}
            </h1>
          </div>
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

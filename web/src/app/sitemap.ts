import type { MetadataRoute } from "next";
import { getSiteUrl } from "@/lib/site-url";
import { getStoreMenu, getStores } from "@/lib/api";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const siteUrl = getSiteUrl();
  const stores = await getStores();
  const homeUrl = new URL("/", siteUrl).toString();
  const englishHomeUrl = new URL("/en", siteUrl).toString();
  const entries: MetadataRoute.Sitemap = [
    {
      url: homeUrl,
      changeFrequency: "daily",
      priority: 1,
      alternates: {
        languages: { ar: homeUrl, en: englishHomeUrl },
      },
    },
    {
      url: englishHomeUrl,
      changeFrequency: "daily",
      priority: 1,
      alternates: {
        languages: { ar: homeUrl, en: englishHomeUrl },
      },
    },
  ];

  for (const store of stores) {
    const storePath = `/stores/${store.id}`;
    const storeUrl = new URL(storePath, siteUrl).toString();
    const englishStoreUrl = new URL(`/en${storePath}`, siteUrl).toString();
    entries.push(
      {
        url: storeUrl,
        changeFrequency: "daily",
        priority: 0.8,
        alternates: {
          languages: { ar: storeUrl, en: englishStoreUrl },
        },
      },
      {
        url: englishStoreUrl,
        changeFrequency: "daily",
        priority: 0.8,
        alternates: {
          languages: { ar: storeUrl, en: englishStoreUrl },
        },
      },
    );

    const menu = await getStoreMenu(store.id);
    for (const product of menu) {
      if (!product.isAvailable) continue;
      const productPath = `/stores/${store.id}/products/${product.id}`;
      const productUrl = new URL(productPath, siteUrl).toString();
      const englishProductUrl = new URL(`/en${productPath}`, siteUrl).toString();
      entries.push(
        {
          url: productUrl,
          changeFrequency: "weekly",
          priority: 0.7,
          alternates: {
            languages: { ar: productUrl, en: englishProductUrl },
          },
        },
        {
          url: englishProductUrl,
          changeFrequency: "weekly",
          priority: 0.7,
          alternates: {
            languages: { ar: productUrl, en: englishProductUrl },
          },
        },
      );
    }
  }

  return entries;
}

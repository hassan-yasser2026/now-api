import type { MetadataRoute } from "next";
import { getSiteUrl } from "@/lib/site-url";
import { getStoreMenu, getStores } from "@/lib/api";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const siteUrl = getSiteUrl();
  const stores = await getStores();
  const entries: MetadataRoute.Sitemap = [
    {
      url: new URL("/", siteUrl).toString(),
      changeFrequency: "daily",
      priority: 1,
    },
  ];

  for (const store of stores) {
    const storeUrl = new URL(`/stores/${store.id}`, siteUrl).toString();
    entries.push({
      url: storeUrl,
      changeFrequency: "daily",
      priority: 0.8,
    });

    const menu = await getStoreMenu(store.id);
    for (const product of menu) {
      if (!product.isAvailable) continue;
      entries.push({
        url: new URL(
          `/stores/${store.id}/products/${product.id}`,
          siteUrl,
        ).toString(),
        changeFrequency: "weekly",
        priority: 0.7,
      });
    }
  }

  return entries;
}

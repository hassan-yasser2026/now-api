export const API_BASE_URL = (
  process.env.NOW_API_URL || "https://api.now-eg.com/api"
).replace(/\/+$/, "");

type ApiEnvelope<T> = {
  success?: boolean;
  data?: T;
  message?: string;
};

export type MenuItem = {
  id: number;
  storeId: number;
  name: string;
  nameAr?: string | null;
  description?: string | null;
  price: number | string;
  originalPrice?: number | string | null;
  discountType?: string | null;
  discountValue?: number | string | null;
  discountPercentage?: number | string | null;
  averageRating?: number | string | null;
  ratingsCount?: number | null;
  ratingDetails?: Array<{
    stars: number;
    comment?: string | null;
    createdAt?: string;
    customerName?: string | null;
  }>;
  category?: { name?: string; nameAr?: string | null } | null;
  categoryId?: number | null;
  image?: string | null;
  isAvailable: boolean;
};

export type Store = {
  id: number;
  name: string;
  description?: string | null;
  image?: string | null;
  isOpen: boolean;
  ratingAverage?: number | null;
  ratingCount?: number | null;
  categoryId?: number | null;
  category?: { name?: string; nameAr?: string | null } | null;
  latitude?: number | string | null;
  longitude?: number | string | null;
  distanceKm?: number | null;
  menuItems: MenuItem[];
};

async function getApiData<T>(path: string): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: { Accept: "application/json" },
    next: { revalidate: 60 },
  });

  let payload: ApiEnvelope<T>;
  try {
    const decoded: unknown = await response.json();
    if (!decoded || typeof decoded !== "object") {
      throw new Error("استجابة غير صالحة");
    }
    payload = decoded as ApiEnvelope<T>;
  } catch {
    throw new Error(`استجابة غير صالحة من الخادم (${response.status})`);
  }

  if (!response.ok || payload.success === false) {
    throw new Error(
      payload.message || `تعذر تحميل البيانات (${response.status})`,
    );
  }

  if (payload.data === undefined) {
    throw new Error("استجابة الخادم لا تحتوي على البيانات المطلوبة");
  }

  return payload.data;
}

export async function getStores(): Promise<Store[]> {
  const stores = await getApiData<Store[]>("/stores");
  if (!Array.isArray(stores)) {
    throw new Error("استجابة المتاجر من الخادم غير صحيحة");
  }
  return stores;
}

export function getStore(storeId: number): Promise<Store | undefined> {
  return getStores().then((stores) =>
    stores.find((store) => store.id === storeId),
  );
}

export function getStoreMenu(storeId: number): Promise<MenuItem[]> {
  return getApiData<MenuItem[]>(`/stores/${storeId}/menu`);
}

export function getSafeImageUrl(
  value: string | null | undefined,
): string | null {
  if (!value) return null;
  if (
    value.length <= 6_000_000 &&
    /^data:image\/(?:png|jpeg|webp|gif);base64,[a-z0-9+/]+=*$/i.test(value)
  ) {
    return value;
  }

  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:"
      ? url.href
      : null;
  } catch {
    return null;
  }
}

export function getOpenGraphImageUrl(value: string | null | undefined) {
  const imageUrl = getSafeImageUrl(value);
  if (imageUrl?.startsWith("https://")) return imageUrl;
  return "/opengraph-image";
}

export function shouldUnoptimizeImage(value: string): boolean {
  if (value.startsWith("data:")) return true;

  try {
    const url = new URL(value);
    return url.hostname !== "images.unsplash.com" || url.protocol !== "https:";
  } catch {
    return true;
  }
}

export function formatPrice(price: number | string, locale = "ar"): string {
  const amount = Number(price);
  if (!Number.isFinite(amount)) {
    throw new Error("السعر المستلم من الخادم غير صالح");
  }

  return new Intl.NumberFormat(locale === "ar" ? "ar-EG" : "en-EG", {
    style: "currency",
    currency: "EGP",
    maximumFractionDigits: 2,
  }).format(amount);
}

"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useTranslations } from "next-intl";
import { useToast } from "./toast-provider";

const STORAGE_KEY = "now_favorite_products";

type ProductFavoritesContextValue = {
  favoriteProductKeys: string[];
  isInitialized: boolean;
  toggleFavorite: (storeId: number, productId: number) => void;
};

const ProductFavoritesContext =
  createContext<ProductFavoritesContextValue | null>(null);

function parseFavoriteKeys(serialized: string | null): string[] {
  if (!serialized) return [];
  const parsed: unknown = JSON.parse(serialized);
  if (
    !Array.isArray(parsed) ||
    !parsed.every(
      (key) => typeof key === "string" && /^\d+:\d+$/.test(key),
    )
  ) {
    throw new Error("Saved favorite products are invalid.");
  }
  return [...new Set(parsed)];
}

export function ProductFavoritesProvider({
  children,
}: {
  children: ReactNode;
}) {
  const t = useTranslations("discovery");
  const { showToast } = useToast();
  const [favoriteProductKeys, setFavoriteProductKeys] = useState<string[]>([]);
  const [isInitialized, setIsInitialized] = useState(false);

  const readFavorites = useCallback(() => {
    try {
      setFavoriteProductKeys(
        parseFavoriteKeys(window.localStorage.getItem(STORAGE_KEY)),
      );
    } catch (error) {
      console.error("Could not load saved favorite products:", error);
      showToast(t("productFavoritesLoadFailed"), "error");
    } finally {
      setIsInitialized(true);
    }
  }, [showToast, t]);

  useEffect(() => {
    function syncStorage(event: StorageEvent) {
      if (event.key === STORAGE_KEY || event.key === null) readFavorites();
    }

    const timer = window.setTimeout(readFavorites, 0);
    window.addEventListener("storage", syncStorage);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("storage", syncStorage);
    };
  }, [readFavorites]);

  const toggleFavorite = useCallback(
    (storeId: number, productId: number) => {
      const key = `${storeId}:${productId}`;
      const nextKeys = favoriteProductKeys.includes(key)
        ? favoriteProductKeys.filter((favoriteKey) => favoriteKey !== key)
        : [...favoriteProductKeys, key];

      try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(nextKeys));
        setFavoriteProductKeys(nextKeys);
        showToast(
          t(
            favoriteProductKeys.includes(key)
              ? "productFavoriteRemoved"
              : "productFavoriteSaved",
          ),
          "success",
        );
      } catch (error) {
        console.error("Could not save favorite products:", error);
        showToast(t("productFavoritesSaveFailed"), "error");
      }
    },
    [favoriteProductKeys, showToast, t],
  );

  const value = useMemo(
    () => ({ favoriteProductKeys, isInitialized, toggleFavorite }),
    [favoriteProductKeys, isInitialized, toggleFavorite],
  );

  return (
    <ProductFavoritesContext.Provider value={value}>
      {children}
    </ProductFavoritesContext.Provider>
  );
}

export function useProductFavorites() {
  const context = useContext(ProductFavoritesContext);
  if (!context) {
    throw new Error(
      "useProductFavorites must be used inside a ProductFavoritesProvider",
    );
  }
  return context;
}

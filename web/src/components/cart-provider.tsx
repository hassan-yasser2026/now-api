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
import type { MenuItem } from "@/lib/api";
import { useTranslations } from "next-intl";

const CART_STORAGE_KEY = "now_customer_web_cart_v1";

export type CartItem = {
  productId: number;
  storeId: number;
  storeName: string;
  name: string;
  nameAr?: string;
  nameEn?: string;
  price: number;
  image: string | null;
  quantity: number;
};

export function getCartItemName(item: CartItem, locale: string) {
  return locale === "en"
    ? item.nameEn || item.name
    : item.nameAr || item.name;
}

type CartContextValue = {
  items: CartItem[];
  itemCount: number;
  error: string;
  addItem: (
    store: { id: number; name: string },
    product: MenuItem,
  ) => "added" | "different-store" | "invalid-product";
  setQuantity: (productId: number, quantity: number) => void;
  removeItem: (productId: number) => void;
  clearCart: () => void;
};

const CartContext = createContext<CartContextValue | null>(null);

function isCartItem(value: unknown): value is CartItem {
  if (!value || typeof value !== "object") return false;
  const item = value as Record<string, unknown>;
  return (
    Number.isSafeInteger(item.productId) &&
    Number(item.productId) > 0 &&
    Number.isSafeInteger(item.storeId) &&
    Number(item.storeId) > 0 &&
    typeof item.storeName === "string" &&
    typeof item.name === "string" &&
    (item.nameAr === undefined || typeof item.nameAr === "string") &&
    (item.nameEn === undefined || typeof item.nameEn === "string") &&
    typeof item.price === "number" &&
    Number.isFinite(item.price) &&
    item.price >= 0 &&
    (typeof item.image === "string" || item.image === null) &&
    Number.isSafeInteger(item.quantity) &&
    Number(item.quantity) > 0 &&
    Number(item.quantity) <= 99
  );
}

function parseCart(serialized: string): CartItem[] {
  const parsed: unknown = JSON.parse(serialized);
  if (!Array.isArray(parsed) || !parsed.every(isCartItem)) {
    throw new Error("Saved cart data is invalid.");
  }

  const storeId = parsed[0]?.storeId;
  if (
    parsed.some((item: CartItem) => item.storeId !== storeId) ||
    new Set(parsed.map((item: CartItem) => item.productId)).size !==
      parsed.length
  ) {
    throw new Error("Saved cart contents are invalid.");
  }

  return parsed;
}

export function CartProvider({ children }: { children: ReactNode }) {
  const t = useTranslations("cart");
  const [items, setItems] = useState<CartItem[]>([]);
  const [error, setError] = useState("");

  const saveItems = useCallback((nextItems: CartItem[]) => {
    setItems(nextItems);
    try {
      if (nextItems.length > 0) {
        window.localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(nextItems));
      } else {
        window.localStorage.removeItem(CART_STORAGE_KEY);
      }
      setError("");
    } catch (writeError) {
      console.error("Could not save the customer cart locally:", writeError);
      setError(t("deviceSaveFailed"));
    }
  }, [t]);

  const readStorage = useCallback(() => {
    try {
      const serialized = window.localStorage.getItem(CART_STORAGE_KEY);
      setItems(serialized ? parseCart(serialized) : []);
      setError("");
    } catch (readError) {
      console.error("Could not read the locally saved cart:", readError);
      setItems([]);
      setError(t("deviceLoadFailed"));
    }
  }, [t]);

  useEffect(() => {
    function syncStorage(event: StorageEvent) {
      if (event.key === CART_STORAGE_KEY || event.key === null) {
        readStorage();
      }
    }

    const initializeTimer = window.setTimeout(readStorage, 0);
    window.addEventListener("storage", syncStorage);
    return () => {
      window.clearTimeout(initializeTimer);
      window.removeEventListener("storage", syncStorage);
    };
  }, [readStorage]);

  const addItem = useCallback(
    (
      store: { id: number; name: string },
      product: MenuItem,
    ): "added" | "different-store" | "invalid-product" => {
      if (!Number.isFinite(Number(product.price))) {
        setError(t("invalidProductPrice"));
        return "invalid-product";
      }

      const price = Number(product.price);
      const existingStoreId = items[0]?.storeId;
      if (existingStoreId !== undefined && existingStoreId !== store.id) {
        return "different-store";
      }

      const existing = items.find((item) => item.productId === product.id);
      const nextItems = existing
        ? items.map((item) =>
            item.productId === product.id
              ? { ...item, quantity: Math.min(item.quantity + 1, 99) }
              : item,
          )
        : [
            ...items,
            {
              productId: product.id,
              storeId: store.id,
              storeName: store.name,
              name: product.nameAr || product.name,
              nameAr: product.nameAr || undefined,
              nameEn: product.name,
              price,
              image: product.image || null,
              quantity: 1,
            },
          ];
      saveItems(nextItems);
      return "added";
    },
    [items, saveItems, t],
  );

  const setQuantity = useCallback(
    (productId: number, quantity: number) => {
      if (!Number.isSafeInteger(quantity)) return;
      if (quantity <= 0) {
        saveItems(items.filter((item) => item.productId !== productId));
        return;
      }
      saveItems(
        items.map((item) =>
          item.productId === productId
            ? { ...item, quantity: Math.min(quantity, 99) }
            : item,
        ),
      );
    },
    [items, saveItems],
  );

  const removeItem = useCallback(
    (productId: number) => {
      saveItems(items.filter((item) => item.productId !== productId));
    },
    [items, saveItems],
  );

  const clearCart = useCallback(() => {
    saveItems([]);
  }, [saveItems]);

  const value = useMemo(
    () => ({
      items,
      itemCount: items.reduce((count, item) => count + item.quantity, 0),
      error,
      addItem,
      setQuantity,
      removeItem,
      clearCart,
    }),
    [items, error, addItem, setQuantity, removeItem, clearCart],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error("useCart must be used inside a CartProvider");
  }
  return context;
}

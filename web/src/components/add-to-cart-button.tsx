"use client";

import { useTranslations } from "next-intl";
import type { MenuItem } from "@/lib/api";
import { useToast } from "./toast-provider";
import { UIButton } from "./ui-button";
import { useCart } from "./cart-provider";

export function AddToCartButton({
  store,
  product,
}: {
  store: { id: number; name: string };
  product: MenuItem;
}) {
  const { addItem } = useCart();
  const { showToast } = useToast();
  const t = useTranslations("toast");

  function add() {
    const result = addItem(store, product);
    if (result === "added") {
      showToast(t("addedToCart"), "success");
    } else if (result === "different-store") {
      showToast(
        t("otherStoreCart"),
        "error",
      );
    } else {
      showToast(t("invalidProduct"), "error");
    }
  }

  return (
    <div>
      <UIButton className="min-h-12 w-full sm:min-h-14 sm:px-7 sm:text-base" type="button" onClick={add}>
        {t("addToCart")}
      </UIButton>
    </div>
  );
}

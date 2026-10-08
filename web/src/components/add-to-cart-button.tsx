"use client";

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

  function add() {
    const result = addItem(store, product);
    if (result === "added") {
      showToast("تمت إضافة المنتج إلى السلة.", "success");
    } else if (result === "different-store") {
      showToast(
        "السلة تحتوي على منتجات من متجر آخر. أفرغ السلة أولًا للطلب من هذا المتجر.",
        "error",
      );
    } else {
      showToast("تعذر إضافة المنتج لأن بياناته غير صالحة.", "error");
    }
  }

  return (
    <div>
      <UIButton className="min-h-12 w-full sm:min-h-14 sm:px-7 sm:text-base" type="button" onClick={add}>
        أضف إلى السلة
      </UIButton>
    </div>
  );
}

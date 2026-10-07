import { NextResponse } from "next/server";
import { API_BASE_URL } from "@/lib/api";
import {
  apiErrorMessage,
  getCustomerSession,
  readApiResponse,
} from "@/lib/server-api";

export const runtime = "nodejs";

type OrderResponse = {
  id?: number;
  status?: string;
  address?: string;
  totalPrice?: number | string;
  subtotal?: number | string;
  deliveryFee?: number | string;
  platformCommission?: number | string;
  createdAt?: string;
  updatedAt?: string;
  scheduledAt?: string | null;
  store?: { id?: number; name?: string };
  items?: Array<{
    id?: number;
    quantity?: number;
    priceAtOrder?: number | string;
    menuItem?: { id?: number; name?: string; nameAr?: string | null };
  }>;
  payment?: { status?: string; method?: string | null };
  paymentTransactions?: Array<{ status?: string; method?: string | null }>;
};

export async function GET(
  _request: Request,
  context: { params: Promise<{ orderId: string }> },
) {
  const { orderId } = await context.params;
  const id = Number(orderId);
  if (!Number.isSafeInteger(id) || id <= 0) {
    return NextResponse.json(
      { success: false, message: "رقم الطلب غير صالح" },
      { status: 400 },
    );
  }

  let session: Awaited<ReturnType<typeof getCustomerSession>>;
  try {
    session = await getCustomerSession();
  } catch (error) {
    console.error("Could not verify customer session before loading order:", error);
    return NextResponse.json(
      { success: false, message: "تعذر التحقق من جلسة العميل" },
      { status: 502 },
    );
  }

  if (!session) {
    return NextResponse.json(
      { success: false, message: "سجّل الدخول لعرض الطلب" },
      { status: 401 },
    );
  }

  let upstream: Response;
  try {
    upstream = await fetch(`${API_BASE_URL}/orders/${id}`, {
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${session.token}`,
      },
      cache: "no-store",
    });
  } catch (error) {
    console.error("Customer order details API request failed:", error);
    return NextResponse.json(
      { success: false, message: "تعذر الاتصال بخدمة NOW" },
      { status: 502 },
    );
  }

  const envelope = await readApiResponse<OrderResponse>(upstream);
  if (!upstream.ok || envelope.success === false) {
    return NextResponse.json(
      {
        success: false,
        message: apiErrorMessage(envelope, upstream.status),
      },
      { status: upstream.status },
    );
  }

  const order = envelope.data;
  if (
    !order ||
    order.id !== id ||
    typeof order.status !== "string" ||
    (typeof order.totalPrice !== "string" &&
      typeof order.totalPrice !== "number")
  ) {
    return NextResponse.json(
      { success: false, message: "استجابة تفاصيل الطلب من NOW غير صحيحة" },
      { status: 502 },
    );
  }

  return NextResponse.json({
    success: true,
    data: {
      id: order.id,
      status: order.status,
      address: order.address,
      totalPrice: order.totalPrice,
      subtotal: order.subtotal,
      deliveryFee: order.deliveryFee,
      platformCommission: order.platformCommission,
      createdAt: order.createdAt,
      updatedAt: order.updatedAt,
      scheduledAt: order.scheduledAt,
      store: order.store
        ? { id: order.store.id, name: order.store.name }
        : undefined,
      items: Array.isArray(order.items)
        ? order.items.map((item) => ({
            id: item.id,
            quantity: item.quantity,
            priceAtOrder: item.priceAtOrder,
            menuItem: item.menuItem
              ? {
                  id: item.menuItem.id,
                  name: item.menuItem.name,
                  nameAr: item.menuItem.nameAr,
                }
              : undefined,
          }))
        : [],
      payment: order.payment
        ? {
            status: order.payment.status,
            method: order.payment.method,
          }
        : order.paymentTransactions?.[0]
          ? {
              status: order.paymentTransactions[0].status,
              method: order.paymentTransactions[0].method,
            }
          : undefined,
    },
  });
}

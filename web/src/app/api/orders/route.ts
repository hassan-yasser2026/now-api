import { NextResponse } from "next/server";
import { API_BASE_URL } from "@/lib/api";
import {
  apiErrorMessage,
  getCustomerSession,
  isSameOriginRequest,
  readApiResponse,
} from "@/lib/server-api";

export const runtime = "nodejs";

type CreateOrderResult = {
  id?: number;
};

export async function POST(request: Request) {
  if (!isSameOriginRequest(request)) {
    return NextResponse.json(
      { success: false, message: "الطلب غير مسموح" },
      { status: 403 },
    );
  }

  let body: {
    storeId?: unknown;
    items?: unknown;
    address?: unknown;
    latitude?: unknown;
    longitude?: unknown;
    paymentMethod?: unknown;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { success: false, message: "بيانات الطلب غير صالحة" },
      { status: 400 },
    );
  }

  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return NextResponse.json(
      { success: false, message: "بيانات الطلب غير صالحة" },
      { status: 400 },
    );
  }

  const address = typeof body.address === "string" ? body.address.trim() : "";
  const items = Array.isArray(body.items) ? body.items : [];
  const validItems = items.every((value) => {
    if (!value || typeof value !== "object") return false;
    const item = value as Record<string, unknown>;
    return (
      typeof item.menuItemId === "number" &&
      Number.isSafeInteger(item.menuItemId) &&
      Number(item.menuItemId) > 0 &&
      typeof item.quantity === "number" &&
      Number.isSafeInteger(item.quantity) &&
      Number(item.quantity) > 0 &&
      Number(item.quantity) <= 99
    );
  });

  if (
    typeof body.storeId !== "number" ||
    !Number.isSafeInteger(body.storeId) ||
    Number(body.storeId) <= 0 ||
    items.length === 0 ||
    !validItems ||
    address.length < 5 ||
    address.length > 500 ||
    typeof body.latitude !== "number" ||
    !Number.isFinite(body.latitude) ||
    Number(body.latitude) < -90 ||
    Number(body.latitude) > 90 ||
    typeof body.longitude !== "number" ||
    !Number.isFinite(body.longitude) ||
    Number(body.longitude) < -180 ||
    Number(body.longitude) > 180 ||
    body.paymentMethod !== "CASH_ON_DELIVERY"
  ) {
    return NextResponse.json(
      { success: false, message: "تحقق من المنتجات والعنوان وموقع التوصيل" },
      { status: 400 },
    );
  }

  let session: Awaited<ReturnType<typeof getCustomerSession>>;
  try {
    session = await getCustomerSession();
  } catch (error) {
    console.error("Could not verify customer session before order creation:", error);
    return NextResponse.json(
      { success: false, message: "تعذر التحقق من جلسة العميل" },
      { status: 502 },
    );
  }

  if (!session) {
    return NextResponse.json(
      { success: false, message: "سجّل الدخول لإتمام الطلب" },
      { status: 401 },
    );
  }

  let upstream: Response;
  try {
    upstream = await fetch(`${API_BASE_URL}/orders`, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.token}`,
      },
      body: JSON.stringify({
        storeId: Number(body.storeId),
        items: items.map((value) => {
          const item = value as { menuItemId: number; quantity: number };
          return {
            menuItemId: Number(item.menuItemId),
            quantity: Number(item.quantity),
          };
        }),
        address,
        latitude: Number(body.latitude),
        longitude: Number(body.longitude),
        paymentMethod: "CASH_ON_DELIVERY",
      }),
      cache: "no-store",
    });
  } catch (error) {
    console.error("Customer order API request failed:", error);
    return NextResponse.json(
      { success: false, message: "تعذر الاتصال بخدمة NOW" },
      { status: 502 },
    );
  }

  const envelope = await readApiResponse<CreateOrderResult>(upstream);
  if (!upstream.ok || envelope.success === false) {
    return NextResponse.json(
      {
        success: false,
        message: apiErrorMessage(envelope, upstream.status),
      },
      { status: upstream.status },
    );
  }

  if (!envelope.data || !Number.isSafeInteger(envelope.data.id)) {
    return NextResponse.json(
      { success: false, message: "استجابة إنشاء الطلب من NOW غير مكتملة" },
      { status: 502 },
    );
  }

  return NextResponse.json(
    { success: true, data: envelope.data, message: envelope.message },
    { status: upstream.status },
  );
}

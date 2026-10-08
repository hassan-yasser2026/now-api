import { NextResponse } from "next/server";
import { API_BASE_URL } from "@/lib/api";
import {
  apiErrorMessage,
  CUSTOMER_SESSION_COOKIE,
  isSameOriginRequest,
  readApiResponse,
  sessionCookieOptions,
} from "@/lib/server-api";

export const runtime = "nodejs";

type LoginResult = {
  token?: string;
  user?: {
    id: number;
    role: string;
    [key: string]: unknown;
  };
};

export async function POST(request: Request) {
  if (!isSameOriginRequest(request)) {
    return NextResponse.json(
      { success: false, message: "الطلب غير مسموح" },
      { status: 403 },
    );
  }

  let body: { phone?: unknown; password?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { success: false, message: "بيانات تسجيل الدخول غير صالحة" },
      { status: 400 },
    );
  }

  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return NextResponse.json(
      { success: false, message: "بيانات تسجيل الدخول غير صالحة" },
      { status: 400 },
    );
  }

  if (
    typeof body.phone !== "string" ||
    !body.phone.trim() ||
    typeof body.password !== "string" ||
    !body.password
  ) {
    return NextResponse.json(
      { success: false, message: "رقم الهاتف وكلمة المرور مطلوبان" },
      { status: 400 },
    );
  }

  let upstream: Response;
  try {
    upstream = await fetch(`${API_BASE_URL}/auth/login`, {
      method: "POST",
      headers: { Accept: "application/json", "Content-Type": "application/json" },
      body: JSON.stringify({
        phone: body.phone.trim(),
        password: body.password,
      }),
      cache: "no-store",
    });
  } catch (error) {
    console.error("Customer login API request failed:", error);
    return NextResponse.json(
      { success: false, message: "تعذر الاتصال بخدمة چودي ستار" },
      { status: 502 },
    );
  }

  const envelope = await readApiResponse<LoginResult>(upstream);
  const result = envelope.data;

  if (!upstream.ok || envelope.success === false) {
    return NextResponse.json(
      {
        success: false,
        message: apiErrorMessage(envelope, upstream.status),
      },
      { status: upstream.status },
    );
  }

  if (!result?.token || !result.user?.id || !result.user.role) {
    return NextResponse.json(
      { success: false, message: "استجابة تسجيل الدخول من چودي ستار غير مكتملة" },
      { status: 502 },
    );
  }

  if (result.user.role.toUpperCase() !== "CUSTOMER") {
    return NextResponse.json(
      { success: false, message: "تسجيل الدخول عبر هذا الموقع متاح للعملاء فقط" },
      { status: 403 },
    );
  }

  const response = NextResponse.json({
    success: true,
    data: { user: result.user },
  });
  response.cookies.set(
    CUSTOMER_SESSION_COOKIE,
    result.token,
    sessionCookieOptions(),
  );
  return response;
}

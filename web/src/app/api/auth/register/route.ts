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

type RegisterResult = {
  token?: string;
  user?: {
    id: number;
    role: string;
    [key: string]: unknown;
  };
  pendingApproval?: boolean;
  phoneVerificationRequired?: boolean;
  message?: string;
};

export async function POST(request: Request) {
  if (!isSameOriginRequest(request)) {
    return NextResponse.json(
      { success: false, message: "الطلب غير مسموح" },
      { status: 403 },
    );
  }

  let body: {
    name?: unknown;
    phone?: unknown;
    email?: unknown;
    password?: unknown;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { success: false, message: "بيانات التسجيل غير صالحة" },
      { status: 400 },
    );
  }

  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return NextResponse.json(
      { success: false, message: "بيانات التسجيل غير صالحة" },
      { status: 400 },
    );
  }

  const name = typeof body.name === "string" ? body.name.trim() : "";
  const phone = typeof body.phone === "string" ? body.phone.trim() : "";
  const email = typeof body.email === "string" ? body.email.trim() : "";
  const password = typeof body.password === "string" ? body.password : "";

  if (name.length < 2 || !phone || password.length < 8) {
    return NextResponse.json(
      {
        success: false,
        message: "أدخل الاسم ورقم الهاتف وكلمة مرور من 8 أحرف على الأقل",
      },
      { status: 400 },
    );
  }

  let upstream: Response;
  try {
    upstream = await fetch(`${API_BASE_URL}/auth/register`, {
      method: "POST",
      headers: { Accept: "application/json", "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        phone,
        ...(email ? { email } : {}),
        password,
        role: "customer",
      }),
      cache: "no-store",
    });
  } catch (error) {
    console.error("Customer registration API request failed:", error);
    return NextResponse.json(
      { success: false, message: "تعذر الاتصال بخدمة چودي ستار" },
      { status: 502 },
    );
  }

  const envelope = await readApiResponse<RegisterResult>(upstream);
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

  if (result?.pendingApproval) {
    return NextResponse.json({
      success: true,
      data: {
        pendingApproval: true,
        message: result.message || "حسابك في انتظار مراجعة الإدارة.",
      },
    });
  }

  if (!result?.token || !result.user?.id || !result.user.role) {
    if (result?.phoneVerificationRequired) {
      return NextResponse.json({
        success: true,
        data: {
          phoneVerificationRequired: true,
          message: result.message || "يلزم تأكيد الحساب قبل تسجيل الدخول.",
        },
      });
    }

    return NextResponse.json(
      { success: false, message: "استجابة التسجيل من چودي ستار غير مكتملة" },
      { status: 502 },
    );
  }

  if (result.user.role.toUpperCase() !== "CUSTOMER") {
    return NextResponse.json(
      { success: false, message: "التسجيل عبر هذا الموقع متاح للعملاء فقط" },
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

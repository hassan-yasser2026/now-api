import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { API_BASE_URL } from "@/lib/api";

const COOKIE_NAME = "now_admin_session";
const COOKIE_AGE = 60 * 60 * 12;

type ApiResponse<T> = {
  success?: boolean;
  data?: T;
  message?: string;
};

type SessionUser = {
  id: number;
  name: string;
  phone?: string;
  role: string;
  permissions?: string[];
};

export async function GET() {
  const token = (await cookies()).get(COOKIE_NAME)?.value;
  if (!token) {
    return NextResponse.json({ authenticated: false });
  }

  try {
    const upstream = await fetch(`${API_BASE_URL}/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });
    const response = (await upstream.json()) as ApiResponse<SessionUser>;
    const user = response.data;

    if (!upstream.ok || !user || !["admin", "sub_admin"].includes(user.role)) {
      const result = NextResponse.json({ authenticated: false });
      result.cookies.delete(COOKIE_NAME);
      return result;
    }

    return NextResponse.json({ authenticated: true, user });
  } catch {
    return NextResponse.json(
      { message: "تعذر الاتصال بالخادم. حاول مرة أخرى." },
      { status: 502 },
    );
  }
}

export async function POST(request: Request) {
  const body = (await request.json()) as {
    phone?: string;
    password?: string;
  };
  if (!body.phone?.trim() || !body.password) {
    return NextResponse.json(
      { message: "أدخل رقم الهاتف وكلمة المرور." },
      { status: 400 },
    );
  }

  try {
    const upstream = await fetch(`${API_BASE_URL}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        phone: body.phone.trim(),
        password: body.password,
      }),
      cache: "no-store",
    });
    const response = (await upstream.json()) as ApiResponse<{
      token: string;
      user: SessionUser;
    }>;
    const result = response.data;

    if (!upstream.ok || !result?.token || !result.user) {
      return NextResponse.json(
        { message: response.message || "تعذر تسجيل الدخول." },
        { status: upstream.status || 401 },
      );
    }

    if (!["admin", "sub_admin"].includes(result.user.role)) {
      return NextResponse.json(
        { message: "هذا الموقع مخصص لحسابات الإدارة فقط." },
        { status: 403 },
      );
    }

    const nextResponse = NextResponse.json({
      authenticated: true,
      user: result.user,
    });
    nextResponse.cookies.set(COOKIE_NAME, result.token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      path: "/",
      maxAge: COOKIE_AGE,
    });
    return nextResponse;
  } catch {
    return NextResponse.json(
      { message: "تعذر الاتصال بالخادم. حاول مرة أخرى." },
      { status: 502 },
    );
  }
}

export async function DELETE() {
  const response = NextResponse.json({ success: true });
  response.cookies.delete(COOKIE_NAME);
  return response;
}

import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { API_BASE_URL } from "@/lib/api";

const COOKIE_NAME = "now_admin_session";
type RouteContext = { params: Promise<{ path: string[] }> };

function removePasswordFields(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(removePasswordFields);
  if (!value || typeof value !== "object") return value;

  return Object.fromEntries(
    Object.entries(value)
      .filter(([key]) => key.toLowerCase() !== "password")
      .map(([key, nested]) => [key, removePasswordFields(nested)]),
  );
}

async function proxy(request: Request, context: RouteContext) {
  const token = (await cookies()).get(COOKIE_NAME)?.value;
  if (!token) {
    return NextResponse.json(
      { message: "انتهت الجلسة. سجّل الدخول مرة أخرى." },
      { status: 401 },
    );
  }

  const { path } = await context.params;
  const pathname = path.map(encodeURIComponent).join("/");
  const incoming = new URL(request.url);
  const target = `${API_BASE_URL}/admin/${pathname}${incoming.search}`;
  const headers = new Headers({ Authorization: `Bearer ${token}` });
  const contentType = request.headers.get("content-type");
  if (contentType) headers.set("Content-Type", contentType);

  try {
    const upstream = await fetch(target, {
      method: request.method,
      headers,
      body: request.method === "GET" || request.method === "HEAD"
        ? undefined
        : await request.arrayBuffer(),
      cache: "no-store",
    });
    let content = await upstream.text();
    const upstreamContentType = upstream.headers.get("content-type") || "application/json";
    if (
      request.method === "GET"
      && pathname === "submissions"
      && upstreamContentType.includes("application/json")
    ) {
      try {
        content = JSON.stringify(removePasswordFields(JSON.parse(content)));
      } catch {
        return NextResponse.json(
          { message: "تعذر قراءة بيانات طلبات الشركاء من الخادم." },
          { status: 502 },
        );
      }
    }
    return new NextResponse(content, {
      status: upstream.status,
      headers: {
        "Content-Type": upstreamContentType,
        "Cache-Control": "no-store",
      },
    });
  } catch {
    return NextResponse.json(
      { message: "تعذر الاتصال بالخادم. تحقق من الاتصال ثم حاول مرة أخرى." },
      { status: 502 },
    );
  }
}

export const GET = proxy;
export const POST = proxy;
export const PATCH = proxy;
export const DELETE = proxy;

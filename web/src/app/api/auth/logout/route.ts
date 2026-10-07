import { NextResponse } from "next/server";
import {
  CUSTOMER_SESSION_COOKIE,
  isSameOriginRequest,
  sessionCookieOptions,
} from "@/lib/server-api";

export async function POST(request: Request) {
  if (!isSameOriginRequest(request)) {
    return NextResponse.json(
      { success: false, message: "الطلب غير مسموح" },
      { status: 403 },
    );
  }

  const response = NextResponse.json({ success: true });
  response.cookies.set(CUSTOMER_SESSION_COOKIE, "", {
    ...sessionCookieOptions(),
    maxAge: 0,
  });
  return response;
}

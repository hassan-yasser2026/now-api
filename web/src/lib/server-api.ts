import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getLocale } from "next-intl/server";
import { API_BASE_URL } from "@/lib/api";

export const CUSTOMER_SESSION_COOKIE = "now_customer_session";
const SESSION_MAX_AGE_SECONDS = 7 * 24 * 60 * 60;

export type CustomerUser = {
  id: number;
  name: string;
  phone: string;
  role: string;
};

type ApiEnvelope<T> = {
  success?: boolean;
  data?: T;
  message?: string;
};

export function sessionCookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: SESSION_MAX_AGE_SECONDS,
  };
}

export async function readApiResponse<T>(
  response: Response,
): Promise<ApiEnvelope<T>> {
  const text = await response.text();
  if (!text) return {};

  try {
    const parsed: unknown = JSON.parse(text);
    if (parsed && typeof parsed === "object") {
      return parsed as ApiEnvelope<T>;
    }
  } catch {
    return { message: text };
  }

  return { message: "استجابة غير صالحة من خدمة چودي ستار" };
}

export function apiErrorMessage<T>(
  envelope: ApiEnvelope<T>,
  status: number,
) {
  return envelope.message || `تعذر إكمال الطلب (${status})`;
}

export function isSameOriginRequest(request: Request) {
  const origin = request.headers.get("origin");
  const host = (
    request.headers.get("x-forwarded-host") || request.headers.get("host") || ""
  )
    .split(",")[0]
    .trim()
    .toLowerCase();
  const protocol = (
    request.headers.get("x-forwarded-proto") ||
    new URL(request.url).protocol.replace(/:$/, "")
  )
    .split(",")[0]
    .trim()
    .toLowerCase();

  if (!origin || !host || !protocol) return false;

  try {
    const originUrl = new URL(origin);
    return (
      originUrl.host.toLowerCase() === host &&
      originUrl.protocol === `${protocol}:`
    );
  } catch {
    return false;
  }
}

export async function getCustomerSession() {
  const token = (await cookies()).get(CUSTOMER_SESSION_COOKIE)?.value;
  if (!token) return null;

  const response = await fetch(`${API_BASE_URL}/auth/me`, {
    headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
    cache: "no-store",
  });

  if (response.status === 401 || response.status === 403) return null;
  const envelope = await readApiResponse<CustomerUser>(response);

  if (!response.ok || envelope.success === false) {
    throw new Error(apiErrorMessage(envelope, response.status));
  }

  const user = envelope.data;
  if (
    !user ||
    !Number.isSafeInteger(user.id) ||
    typeof user.role !== "string" ||
    !user.role
  ) {
    throw new Error("استجابة المستخدم من خدمة چودي ستار غير مكتملة");
  }

  return user.role.toUpperCase() === "CUSTOMER" ? { user, token } : null;
}

export async function requireCustomer(nextPath: string) {
  const session = await getCustomerSession();
  if (!session) {
    const locale = await getLocale();
    redirect(
      `${locale === "ar" ? "" : "/en"}/login?next=${encodeURIComponent(nextPath)}`,
    );
  }
  return session;
}

export async function getCustomerOrders(
  customerId: number,
  token: string,
) {
  const response = await fetch(
    `${API_BASE_URL}/customer/${customerId}/orders`,
    {
      headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
      cache: "no-store",
    },
  );
  const envelope = await readApiResponse<unknown[]>(response);
  if (!response.ok || envelope.success === false) {
    throw new Error(apiErrorMessage(envelope, response.status));
  }
  if (!Array.isArray(envelope.data)) {
    throw new Error("استجابة الطلبات من خدمة چودي ستار غير صحيحة");
  }
  return envelope.data;
}

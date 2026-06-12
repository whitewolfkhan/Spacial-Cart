"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { ADMIN_COOKIE, createAdminToken } from "@/lib/auth";

export type LoginResult = { error: string } | undefined;

const COOKIE_MAX_AGE = 60 * 60 * 8; // 8 hours

/**
 * Verify the submitted password against ADMIN_PASSWORD. On success, set a
 * signed HttpOnly cookie and redirect into the dashboard.
 */
export async function login(
  _prev: LoginResult,
  formData: FormData,
): Promise<LoginResult> {
  const password = String(formData.get("password") ?? "");
  const from = String(formData.get("from") ?? "/admin");

  const expected = process.env.ADMIN_PASSWORD;
  if (!expected) {
    return { error: "Admin login is not configured (ADMIN_PASSWORD unset)." };
  }
  if (!password || password !== expected) {
    return { error: "Incorrect password." };
  }

  const token = await createAdminToken();
  const cookieStore = await cookies();
  cookieStore.set(ADMIN_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: COOKIE_MAX_AGE,
  });

  // Only allow same-site relative redirects (avoid open-redirect via ?from=).
  const dest = from.startsWith("/admin") ? from : "/admin";
  redirect(dest);
}

/** Clear the admin cookie and return to the login page. */
export async function logout(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(ADMIN_COOKIE);
  redirect("/admin/login");
}

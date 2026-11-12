"use server";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { ADMIN_COOKIE, sessionValue, tokenMatches } from "@/lib/admin-auth";

export async function adminLogin(formData: FormData) {
  const token = String(formData.get("token") ?? "");
  if (!tokenMatches(token)) redirect("/admin?error=1");
  (await cookies()).set(ADMIN_COOKIE, sessionValue(), { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: 60 * 60 * 12 });
  redirect("/admin");
}

export async function adminLogout() {
  (await cookies()).delete(ADMIN_COOKIE);
  redirect("/admin");
}

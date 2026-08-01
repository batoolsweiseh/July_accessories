"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export async function loginAction(formData: FormData) {
  const password = formData.get("password") as string;
  const from = (formData.get("from") as string) || "/admin";
  const adminPassword = process.env.ADMIN_PASSWORD || "July2026";

  if (password === adminPassword) {
    const cookieStore = cookies();
    cookieStore.set("admin_session", adminPassword, {
      httpOnly: true,
      path: "/",
      maxAge: 60 * 60 * 24 * 7, // 7 days
      sameSite: "lax",
    });
    redirect(from);
  }

  // Wrong password
  redirect(`/admin/login?error=1&from=${encodeURIComponent(from)}`);
}

export async function logoutAction() {
  const cookieStore = cookies();
  cookieStore.delete("admin_session");
  redirect("/admin/login");
}

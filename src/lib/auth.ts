import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

const COOKIE = "admin_session";

function token(): string | null {
  const pw = process.env.ADMIN_PASSWORD;
  if (!pw) return null;
  const secret = process.env.ADMIN_SECRET || pw;
  return createHmac("sha256", secret).update(`admin:${pw}`).digest("hex");
}

const same = (a: string, b: string) => {
  const x = Buffer.from(a), y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
};

export async function isAdmin(): Promise<boolean> {
  const t = token();
  if (!t) return false;
  const v = (await cookies()).get(COOKIE)?.value;
  return !!v && same(v, t);
}

export async function requireAdmin() {
  if (!(await isAdmin())) redirect("/admin/login");
}

export async function login(password: string): Promise<boolean> {
  const pw = process.env.ADMIN_PASSWORD;
  const t = token();
  if (!pw || !t || !same(password, pw)) return false;
  (await cookies()).set(COOKIE, t, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
  return true;
}

export async function logout() {
  (await cookies()).delete(COOKIE);
}

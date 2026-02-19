import { NextResponse } from "next/server";
import { SESSION_COOKIE, signSession } from "@/lib/auth-session";
import { validateUser } from "@/lib/auth-users";

export async function POST(req: Request) {
  const body = await req.json().catch(() => null) as { email?: string; password?: string } | null;

  const email = body?.email?.trim();
  const password = body?.password ?? "";

  if (!email || !password) {
    return NextResponse.json({ error: "邮箱和密码不能为空" }, { status: 400 });
  }

  const user = await validateUser(email, password);
  if (!user) {
    return NextResponse.json({ error: "邮箱或密码错误" }, { status: 401 });
  }

  const token = await signSession({ email: user.email, role: user.role });
  const res = NextResponse.json({ ok: true, user });
  res.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });

  return res;
}

import bcrypt from "bcryptjs";

export type AuthUser = {
  email: string;
  passwordHash: string;
  role?: string;
};

function getAuthUsers(): AuthUser[] {
  const raw = process.env.AUTH_USERS_JSON;
  if (!raw) return [];

  try {
    const parsed = JSON.parse(raw) as AuthUser[];
    return parsed.filter((u) => u.email && u.passwordHash);
  } catch {
    return [];
  }
}

export async function validateUser(email: string, password: string) {
  const users = getAuthUsers();
  const found = users.find((u) => u.email.toLowerCase() === email.toLowerCase());

  if (found) {
    const ok = await bcrypt.compare(password, found.passwordHash);
    if (ok) {
      return {
        email: found.email,
        role: found.role ?? "creator",
      };
    }
  }

  // 临时重置口令（便于生产紧急恢复登录）
  const resetEmail = process.env.AUTH_RESET_EMAIL?.trim().toLowerCase();
  const resetPassword = process.env.AUTH_RESET_PASSWORD ?? "";
  if (resetEmail && resetPassword && email.toLowerCase() === resetEmail && password === resetPassword) {
    return {
      email,
      role: "admin",
    };
  }

  return null;
}

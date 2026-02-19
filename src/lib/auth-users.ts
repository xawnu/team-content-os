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
  if (!found) return null;

  const ok = await bcrypt.compare(password, found.passwordHash);
  if (!ok) return null;

  return {
    email: found.email,
    role: found.role ?? "creator",
  };
}

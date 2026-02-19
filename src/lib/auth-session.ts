import { SignJWT, jwtVerify } from "jose";

export const SESSION_COOKIE = "tcos_session";

type SessionPayload = {
  email: string;
  role: string;
};

function getSecret() {
  const secret = process.env.AUTH_SECRET;
  if (!secret) {
    throw new Error("Missing AUTH_SECRET");
  }
  return new TextEncoder().encode(secret);
}

export async function signSession(payload: SessionPayload) {
  return await new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(getSecret());
}

export async function verifySession(token: string) {
  const { payload } = await jwtVerify(token, getSecret());
  return {
    email: String(payload.email ?? ""),
    role: String(payload.role ?? "creator"),
  };
}

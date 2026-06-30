import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { PARENT_SESSION_COOKIE, PARENT_SESSION_MAX_AGE } from "./constants";

export type ParentSessionPayload = {
  studentId: string;
};

function getSecret() {
  const secret = process.env.AUTH_SECRET;
  if (!secret) throw new Error("AUTH_SECRET is not configured");
  return new TextEncoder().encode(secret);
}

export async function signParentSession(payload: ParentSessionPayload) {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${PARENT_SESSION_MAX_AGE}s`)
    .sign(getSecret());
}

export async function verifyParentSession(
  token: string
): Promise<ParentSessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getSecret());
    if (typeof payload.studentId !== "string") return null;
    return { studentId: payload.studentId };
  } catch {
    return null;
  }
}

export async function setParentSessionCookie(payload: ParentSessionPayload) {
  const token = await signParentSession(payload);
  const cookieStore = await cookies();
  cookieStore.set(PARENT_SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: PARENT_SESSION_MAX_AGE,
    path: "/",
  });
}

export async function getParentSession(): Promise<ParentSessionPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(PARENT_SESSION_COOKIE)?.value;
  if (!token) return null;
  return verifyParentSession(token);
}

export async function clearParentSession() {
  const cookieStore = await cookies();
  cookieStore.delete(PARENT_SESSION_COOKIE);
}

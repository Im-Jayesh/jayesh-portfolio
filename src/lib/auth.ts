import { headers } from "next/headers";
import jwt from "jsonwebtoken";
import { db } from "./db";
import { loginAttempts } from "./schema";
import { eq } from "drizzle-orm";

const JWT_SECRET = process.env.JWT_SECRET || "fallback_secret_key_1234!";
const MAX_ATTEMPTS = 5;
const COOLDOWN_MINUTES = 15;

export async function getClientIp(): Promise<string> {
  const headerList = await headers();
  const forwardedFor = headerList.get("x-forwarded-for");
  if (forwardedFor) {
    return forwardedFor.split(",")[0].trim();
  }
  return "127.0.0.1";
}

export async function checkRateLimit(ipAddress: string): Promise<{ blocked: boolean; timeLeftMinutes?: number }> {
  const result = await db.select().from(loginAttempts).where(eq(loginAttempts.ipAddress, ipAddress));
  if (result.length === 0) {
    return { blocked: false };
  }

  const record = result[0];
  if (record.blockedUntil) {
    const blockedUntilTime = new Date(record.blockedUntil).getTime();
    const now = Date.now();
    if (now < blockedUntilTime) {
      const timeLeftMs = blockedUntilTime - now;
      return { blocked: true, timeLeftMinutes: Math.ceil(timeLeftMs / 1000 / 60) };
    } else {
      // Cooldown expired, clear record
      await db.delete(loginAttempts).where(eq(loginAttempts.ipAddress, ipAddress));
    }
  }

  return { blocked: false };
}

export async function recordFailedAttempt(ipAddress: string): Promise<number> {
  const result = await db.select().from(loginAttempts).where(eq(loginAttempts.ipAddress, ipAddress));
  
  if (result.length === 0) {
    await db.insert(loginAttempts).values({
      ipAddress,
      attempts: 1,
      lastAttempt: new Date(),
    });
    return 1;
  }

  const record = result[0];
  const newAttempts = record.attempts + 1;

  if (newAttempts >= MAX_ATTEMPTS) {
    const blockedUntil = new Date(Date.now() + COOLDOWN_MINUTES * 60 * 1000);
    await db.update(loginAttempts)
      .set({
        attempts: newAttempts,
        lastAttempt: new Date(),
        blockedUntil,
      })
      .where(eq(loginAttempts.ipAddress, ipAddress));
  } else {
    await db.update(loginAttempts)
      .set({
        attempts: newAttempts,
        lastAttempt: new Date(),
      })
      .where(eq(loginAttempts.ipAddress, ipAddress));
  }

  return newAttempts;
}

export async function resetFailedAttempts(ipAddress: string): Promise<void> {
  await db.delete(loginAttempts).where(eq(loginAttempts.ipAddress, ipAddress));
}

export function signToken(username: string): string {
  return jwt.sign({ username }, JWT_SECRET, { expiresIn: "7d" });
}

export function verifyToken(token: string): { username: string } | null {
  try {
    return jwt.verify(token, JWT_SECRET) as { username: string };
  } catch {
    return null;
  }
}

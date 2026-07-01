"use server";

import { cookies } from "next/headers";
import { db } from "../lib/db";
import { photos } from "../lib/schema";
import { eq, desc } from "drizzle-orm";
import { cloudinary, apiKey, cloudName, generateSignature } from "../lib/cloudinary";
import {
  getClientIp,
  checkRateLimit,
  recordFailedAttempt,
  resetFailedAttempts,
  signToken,
  verifyToken,
} from "../lib/auth";

// Auth validation helper for Server Actions
export async function isAuthenticated(): Promise<boolean> {
  const cookieStore = await cookies();
  const adminSession = cookieStore.get("admin_session");
  if (!adminSession) return false;
  
  const verified = verifyToken(adminSession.value);
  return !!verified;
}

// Admin login action
export async function adminLogin(prevState: any, formData: FormData) {
  const username = formData.get("username") as string;
  const password = formData.get("password") as string;
  
  const ipAddress = await getClientIp();
  
  // 1. Check rate limit
  const rateLimit = await checkRateLimit(ipAddress);
  if (rateLimit.blocked) {
    return {
      success: false,
      error: `Too many failed attempts. Locked out. Try again in ${rateLimit.timeLeftMinutes} minutes.`,
    };
  }
  
  // 2. Validate credentials
  const expectedUsername = process.env.ADMIN_USERNAME || "admin";
  const expectedPassword = process.env.ADMIN_PASSWORD;
  
  if (!expectedPassword) {
    return {
      success: false,
      error: "Admin password is not configured on the server.",
    };
  }
  
  if (username === expectedUsername && password === expectedPassword) {
    // Reset rate limiter
    await resetFailedAttempts(ipAddress);
    
    // Create session cookie
    const token = signToken(username);
    const cookieStore = await cookies();
    cookieStore.set({
      name: "admin_session",
      value: token,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      path: "/",
      maxAge: 60 * 60 * 24 * 7, // 7 days
    });
    
    return { success: true };
  } else {
    // Record failed attempt
    const attempts = await recordFailedAttempt(ipAddress);
    const remaining = 5 - attempts;
    
    if (remaining <= 0) {
      return {
        success: false,
        error: "Too many failed attempts. Locked out for 15 minutes.",
      };
    }
    
    return {
      success: false,
      error: `Invalid credentials. ${remaining} attempts remaining before lockout.`,
    };
  }
}

// Admin logout action
export async function adminLogout(formData?: FormData): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set({
    name: "admin_session",
    value: "",
    maxAge: 0,
    path: "/",
  });
}

// Get signature parameters for direct client side upload
export async function getCloudinaryUploadSignature() {
  if (!(await isAuthenticated())) {
    throw new Error("Unauthorized");
  }
  
  const timestamp = Math.round(Date.now() / 1000);
  const folder = "portfolio_carousel";
  
  const paramsToSign = {
    timestamp,
    folder,
  };
  
  const signature = generateSignature(paramsToSign);
  
  return {
    signature,
    timestamp,
    apiKey,
    cloudName,
    folder,
  };
}

// Save photo metadata once uploaded on the client side
export async function saveUploadedPhoto(url: string, publicId: string, title?: string) {
  if (!(await isAuthenticated())) {
    throw new Error("Unauthorized");
  }
  
  // Find highest display order
  const lastPhoto = await db
    .select()
    .from(photos)
    .orderBy(desc(photos.displayOrder))
    .limit(1);
    
  const nextOrder = lastPhoto.length > 0 ? lastPhoto[0].displayOrder + 1 : 0;
  
  const [newPhoto] = await db
    .insert(photos)
    .values({
      url,
      publicId,
      title: title || null,
      displayOrder: nextOrder,
    })
    .returning();
    
  return { success: true, photo: newPhoto };
}

// Delete photo
export async function deletePhoto(id: number) {
  if (!(await isAuthenticated())) {
    throw new Error("Unauthorized");
  }
  
  // Get publicId to delete from Cloudinary
  const photo = await db
    .select()
    .from(photos)
    .where(eq(photos.id, id))
    .limit(1);
    
  if (photo.length === 0) {
    throw new Error("Photo not found");
  }
  
  const publicId = photo[0].publicId;
  
  // 1. Delete from Cloudinary
  try {
    await cloudinary.uploader.destroy(publicId);
  } catch (error) {
    console.error("Cloudinary deletion failed, continuing with DB deletion:", error);
  }
  
  // 2. Delete from database
  await db.delete(photos).where(eq(photos.id, id));
  
  return { success: true };
}

// Update multiple photo display orders (e.g. after reordering)
export async function updatePhotosOrder(orderedIds: number[]) {
  if (!(await isAuthenticated())) {
    throw new Error("Unauthorized");
  }
  
  // Perform updates in parallel
  await Promise.all(
    orderedIds.map((id, index) =>
      db
        .update(photos)
        .set({ displayOrder: index })
        .where(eq(photos.id, id))
    )
  );
  
  return { success: true };
}

// Get all photos sorted by order
export async function getPhotos() {
  return db
    .select()
    .from(photos)
    .orderBy(photos.displayOrder);
}

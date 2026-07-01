import { v2 as cloudinary } from "cloudinary";

const cloudinaryUrl = process.env.CLOUDINARY_URL || "";
const match = cloudinaryUrl.match(/cloudinary:\/\/([^:]+):([^@]+)@(.+)/);

export const cloudName = match ? match[3] : "";
export const apiKey = match ? match[1] : "";
export const apiSecret = match ? match[2] : "";

cloudinary.config({
  cloud_name: cloudName,
  api_key: apiKey,
  api_secret: apiSecret,
  secure: true,
});

export { cloudinary };

/**
 * Generates a signature for a signed client-side upload to Cloudinary.
 * @param paramsToSign Object containing parameters to sign (e.g. timestamp, folder)
 */
export function generateSignature(paramsToSign: Record<string, any>): string {
  if (!apiSecret) {
    throw new Error("Cloudinary API secret is not configured");
  }
  return cloudinary.utils.api_sign_request(paramsToSign, apiSecret);
}

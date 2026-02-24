import { S3Client, PutObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import sharp from "sharp";
import { v4 as uuidv4 } from "uuid";
import { env } from "../config/env";
import { ApiError } from "./api-error";

// Configure S3 client for DigitalOcean Spaces
// endpoint must be the regional base URL (NOT the bucket-specific URL)
const s3Client = new S3Client({
  endpoint: env.DO_ENDPOINT, // e.g. https://sgp1.digitaloceanspaces.com
  region: env.DO_REGION || "us-east-1",
  credentials: {
    accessKeyId: env.DO_ACCESS_KEY_ID || "",
    secretAccessKey: env.DO_ACCESS_SECRET_KEY || "",
  },
  forcePathStyle: false, // DO Spaces uses virtual-hosted-style URLs
});

const BUCKET_NAME = env.DO_BUCKET_NAME;

export const uploadImage = async (
  file: Express.Multer.File,
  folder: string = "uploads",
  width: number = 400,
  height: number = 400
): Promise<string> => {
  try {
    const fileName = `${folder}/${uuidv4()}.webp`;
    
    const processedImage = sharp(file.buffer);
    
    // Process image with Sharp
    const buffer = await processedImage
      .resize(width, height, {
        fit: "cover",
        position: "center",
      })
      .webp({ quality: 80 })
      .toBuffer();

    const command = new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: fileName,
      Body: buffer,
      ContentType: "image/webp",
      ACL: "public-read",
    });

    await s3Client.send(command);

    // Public URL format for DO Spaces:
    // https://{bucket}.{region}.digitaloceanspaces.com/{key}
    // env.DO_ENDPOINT = https://sgp1.digitaloceanspaces.com
    const publicUrl = env.DO_ENDPOINT.replace('https://', `https://${BUCKET_NAME}.`);
    return `${publicUrl}/${fileName}`;
  } catch (error) {
    console.error("Storage upload error:", error);
    throw new ApiError(500, "Failed to upload image");
  }
};

/**
 * Delete an object from DigitalOcean Spaces by its public URL.
 * Silently ignores missing keys so callers don't need to worry about
 * double-deletes or already-cleaned-up files.
 */
export const deleteImage = async (url: string): Promise<void> => {
  try {
    if (!url) return;

    const publicBase = env.DO_ENDPOINT.replace('https://', `https://${BUCKET_NAME}.`);
    if (!url.startsWith(publicBase)) return; // not our bucket, skip

    const key = url.replace(`${publicBase}/`, '');

    const command = new DeleteObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
    });

    await s3Client.send(command);
  } catch (error) {
    // Log but do not throw — deletion failure should never surface to the user
    console.error("Storage delete error:", error);
  }
};

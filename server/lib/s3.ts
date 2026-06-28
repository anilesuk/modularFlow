import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  ListObjectsV2Command,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const s3Client = new S3Client({
  region: process.env.AWS_REGION || "us-east-1",
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || "",
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || "",
  },
});

const BUCKET_NAME = process.env.AWS_S3_BUCKET || "modularflow-prod";
const CLOUDFRONT_DOMAIN = process.env.CLOUDFRONT_DOMAIN || "";

/**
 * Upload file to S3
 */
export async function uploadToS3(
  key: string,
  body: Buffer | string,
  contentType: string
) {
  try {
    const command = new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
      Body: body,
      ContentType: contentType,
      ServerSideEncryption: "AES256",
      // Cache PDFs for 7 days
      CacheControl: key.endsWith(".pdf") ? "public, max-age=604800" : "no-cache",
    });

    const response = await s3Client.send(command);
    console.log(`✓ Uploaded ${key} to S3`);
    return response;
  } catch (error) {
    console.error(`✗ Failed to upload ${key}:`, error);
    throw error;
  }
}

/**
 * Generate presigned URL for download (15-minute expiry)
 */
export async function generatePresignedDownloadUrl(
  key: string,
  expiresIn: number = 900 // 15 minutes
) {
  try {
    const command = new GetObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
    });

    const url = await getSignedUrl(s3Client, command, { expiresIn });
    console.log(`✓ Generated presigned URL for ${key}`);
    return url;
  } catch (error) {
    console.error(`✗ Failed to generate URL for ${key}:`, error);
    throw error;
  }
}

/**
 * Get CloudFront CDN URL (if file is public)
 */
export function getCloudfrontUrl(key: string) {
  if (!CLOUDFRONT_DOMAIN) {
    return null;
  }
  return `${CLOUDFRONT_DOMAIN}/${key}`;
}

/**
 * Delete file from S3
 */
export async function deleteFromS3(key: string) {
  try {
    const command = new DeleteObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
    });

    const response = await s3Client.send(command);
    console.log(`✓ Deleted ${key} from S3`);
    return response;
  } catch (error) {
    console.error(`✗ Failed to delete ${key}:`, error);
    throw error;
  }
}

/**
 * List files in S3 folder
 */
export async function listS3Files(prefix: string) {
  try {
    const command = new ListObjectsV2Command({
      Bucket: BUCKET_NAME,
      Prefix: prefix,
    });

    const response = await s3Client.send(command);
    return response.Contents || [];
  } catch (error) {
    console.error(`✗ Failed to list files with prefix ${prefix}:`, error);
    throw error;
  }
}

/**
 * S3 key builder for organized storage
 */
export const s3Keys = {
  // CV artifacts: users/{userId}/cv/{runId}/{document}.pdf
  cv: (userId: string, runId: string, filename: string) =>
    `users/${userId}/cv/${runId}/${filename}`,

  // Cover letters: users/{userId}/letters/{runId}/{document}.pdf
  coverLetter: (userId: string, runId: string, filename: string) =>
    `users/${userId}/letters/${runId}/${filename}`,

  // Enhancement notes: users/{userId}/notes/{runId}/{document}.pdf
  notes: (userId: string, runId: string, filename: string) =>
    `users/${userId}/notes/${runId}/${filename}`,

  // Profile pictures: users/{userId}/profile/avatar.jpg
  avatar: (userId: string) => `users/${userId}/profile/avatar.jpg`,

  // Temp files: temp/{jobRunId}/{filename}
  temp: (jobRunId: string, filename: string) =>
    `temp/${jobRunId}/${filename}`,

  // Archived: archive/{date}/{filename}
  archive: (date: string, filename: string) => `archive/${date}/${filename}`,
};

export default s3Client;

import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { Readable } from "stream";

// Initialize S3 client for Replit Object Storage
const s3Client = new S3Client({
  region: "auto",
  endpoint: process.env.OBJECT_STORAGE_ENDPOINT || "",
  credentials: {
    accessKeyId: process.env.OBJECT_STORAGE_ACCESS_KEY_ID || "",
    secretAccessKey: process.env.OBJECT_STORAGE_SECRET_ACCESS_KEY || "",
  },
});

const bucketName = process.env.DEFAULT_OBJECT_STORAGE_BUCKET_ID || "";

export interface UploadOptions {
  key: string;
  body: Buffer | Readable;
  contentType?: string;
  metadata?: Record<string, string>;
}

export class ObjectStorageService {
  /**
   * Upload a file to object storage
   */
  async upload(options: UploadOptions): Promise<string> {
    const command = new PutObjectCommand({
      Bucket: bucketName,
      Key: options.key,
      Body: options.body,
      ContentType: options.contentType || "application/octet-stream",
      Metadata: options.metadata || {},
    });

    await s3Client.send(command);
    return options.key;
  }

  /**
   * Get a file from object storage
   */
  async getObject(key: string): Promise<Buffer> {
    const command = new GetObjectCommand({
      Bucket: bucketName,
      Key: key,
    });

    const response = await s3Client.send(command);
    
    if (!response.Body) {
      throw new Error("No body in response");
    }

    // Convert stream to buffer
    const chunks: Uint8Array[] = [];
    for await (const chunk of response.Body as any) {
      chunks.push(chunk);
    }
    return Buffer.concat(chunks);
  }

  /**
   * Generate a signed URL for downloading a file
   */
  async getSignedDownloadUrl(key: string, expiresIn: number = 3600): Promise<string> {
    const command = new GetObjectCommand({
      Bucket: bucketName,
      Key: key,
    });

    return getSignedUrl(s3Client, command, { expiresIn });
  }

  /**
   * Delete a file from object storage
   */
  async delete(key: string): Promise<void> {
    const command = new DeleteObjectCommand({
      Bucket: bucketName,
      Key: key,
    });

    await s3Client.send(command);
  }

  /**
   * Generate a unique storage path for a user's document
   */
  generateStoragePath(userId: string, runId: string, documentType: string): string {
    const timestamp = Date.now();
    return `.private/${userId}/${runId}/${documentType}_${timestamp}.pdf`;
  }
}

export const objectStorage = new ObjectStorageService();

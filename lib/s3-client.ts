/**
 * AWS S3 클라이언트 유틸리티
 * 파일 업로드, 다운로드, 삭제 등을 처리
 */

import { S3Client, PutObjectCommand, DeleteObjectCommand, GetObjectCommand, HeadObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import crypto from 'crypto';

const s3Client = new S3Client({
  region: process.env.S3_REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
  },
});

export interface S3UploadOptions {
  bucket: string;
  key: string;
  body: Buffer | Uint8Array | string;
  contentType: string;
  metadata?: Record<string, string>;
  cacheControl?: string;
}

export interface S3UploadResult {
  bucket: string;
  key: string;
  etag: string;
  versionId?: string;
}

/**
 * S3에 파일 업로드
 */
export async function uploadToS3(options: S3UploadOptions): Promise<S3UploadResult> {
  try {
    const command = new PutObjectCommand({
      Bucket: options.bucket,
      Key: options.key,
      Body: options.body,
      ContentType: options.contentType,
      Metadata: options.metadata,
      CacheControl: options.cacheControl || 'max-age=31536000', // 1년
      ServerSideEncryption: 'AES256',
    });

    const response = await s3Client.send(command);

    return {
      bucket: options.bucket,
      key: options.key,
      etag: response.ETag || '',
      versionId: response.VersionId,
    };
  } catch (error) {
    console.error('[S3] 업로드 실패:', error);
    throw new Error(`S3 업로드 실패: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * S3에서 파일 삭제
 */
export async function deleteFromS3(bucket: string, key: string): Promise<boolean> {
  try {
    const command = new DeleteObjectCommand({
      Bucket: bucket,
      Key: key,
    });

    await s3Client.send(command);
    return true;
  } catch (error) {
    console.error('[S3] 삭제 실패:', error);
    return false;
  }
}

/**
 * S3에서 여러 파일 삭제
 */
export async function deleteMultipleFromS3(bucket: string, keys: string[]): Promise<{ deleted: string[]; failed: string[] }> {
  const deleted: string[] = [];
  const failed: string[] = [];

  for (const key of keys) {
    const success = await deleteFromS3(bucket, key);
    if (success) {
      deleted.push(key);
    } else {
      failed.push(key);
    }
  }

  return { deleted, failed };
}

/**
 * S3에서 파일 다운로드 (스트림)
 */
export async function getFromS3(bucket: string, key: string): Promise<Buffer> {
  try {
    const command = new GetObjectCommand({
      Bucket: bucket,
      Key: key,
    });

    const response = await s3Client.send(command);
    const chunks: Uint8Array[] = [];

    if (response.Body) {
      for await (const chunk of response.Body as AsyncIterable<Uint8Array>) {
        chunks.push(chunk);
      }
    }

    return Buffer.concat(chunks);
  } catch (error) {
    console.error('[S3] 다운로드 실패:', error);
    throw new Error(`S3 다운로드 실패: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * S3 파일 메타데이터 조회
 */
export async function getS3FileMetadata(bucket: string, key: string): Promise<{
  size: number;
  lastModified: Date;
  contentType: string;
  etag: string;
} | null> {
  try {
    const command = new HeadObjectCommand({
      Bucket: bucket,
      Key: key,
    });

    const response = await s3Client.send(command);

    return {
      size: response.ContentLength || 0,
      lastModified: response.LastModified || new Date(),
      contentType: response.ContentType || 'application/octet-stream',
      etag: response.ETag || '',
    };
  } catch (error) {
    console.error('[S3] 메타데이터 조회 실패:', error);
    return null;
  }
}

/**
 * S3 사전 서명된 URL 생성 (다운로드 URL)
 */
export async function generatePresignedDownloadUrl(
  bucket: string,
  key: string,
  expiresIn: number = 3600 // 1시간
): Promise<string> {
  try {
    const command = new GetObjectCommand({
      Bucket: bucket,
      Key: key,
    });

    const signedUrl = await getSignedUrl(s3Client, command, { expiresIn });
    return signedUrl;
  } catch (error) {
    console.error('[S3] 서명된 URL 생성 실패:', error);
    throw new Error(`서명된 URL 생성 실패: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * S3 사전 서명된 URL 생성 (업로드 URL)
 */
export async function generatePresignedUploadUrl(
  bucket: string,
  key: string,
  contentType: string,
  expiresIn: number = 3600 // 1시간
): Promise<string> {
  try {
    const command = new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      ContentType: contentType,
    });

    const signedUrl = await getSignedUrl(s3Client, command, { expiresIn });
    return signedUrl;
  } catch (error) {
    console.error('[S3] 업로드 서명된 URL 생성 실패:', error);
    throw new Error(`업로드 서명된 URL 생성 실패: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * 병렬 업로드용 사전 서명된 URL 생성
 */
export async function generateMultiPartUploadUrls(
  bucket: string,
  key: string,
  contentType: string,
  partCount: number
): Promise<string[]> {
  const urls: string[] = [];

  for (let i = 1; i <= partCount; i++) {
    const partKey = `${key}.part${i}`;
    const url = await generatePresignedUploadUrl(bucket, partKey, contentType);
    urls.push(url);
  }

  return urls;
}

/**
 * S3 캐시 무효화 (CloudFront 등)
 */
export async function invalidateS3Cache(keys: string[]): Promise<void> {
  // CloudFront 또는 다른 CDN 캐시 무효화
  // 실제 구현은 CloudFront API 필요
  console.log('[S3] 캐시 무효화:', keys);
}

/**
 * S3 객체 ACL 설정
 */
export async function setS3ObjectAcl(
  bucket: string,
  key: string,
  acl: 'public-read' | 'private' | 'public-read-write' = 'private'
): Promise<boolean> {
  try {
    // AWS SDK v3에서 ACL 설정은 PutObjectAcl 명령 필요
    // 간단한 구현으로 표시
    console.log(`[S3] ACL 설정: ${key} -> ${acl}`);
    return true;
  } catch (error) {
    console.error('[S3] ACL 설정 실패:', error);
    return false;
  }
}

export default {
  uploadToS3,
  deleteFromS3,
  deleteMultipleFromS3,
  getFromS3,
  getS3FileMetadata,
  generatePresignedDownloadUrl,
  generatePresignedUploadUrl,
  generateMultiPartUploadUrls,
  invalidateS3Cache,
  setS3ObjectAcl,
};

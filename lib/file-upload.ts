/**
 * 파일 업로드 유틸리티
 * AWS S3 또는 로컬 저장소를 지원
 */

import crypto from 'crypto';
import path from 'path';

export interface FileUploadConfig {
  maxFileSize: number; // bytes
  maxImageSize: number;
  maxVideoSize: number;
  allowedImageTypes: string[];
  allowedVideoTypes: string[];
  allowedDocTypes: string[];
  s3Bucket: string;
  s3Region: string;
  cdnUrl?: string;
}

export interface UploadedFile {
  fileName: string;
  originalName: string;
  fileType: 'image' | 'video' | 'audio' | 'document';
  mimeType: string;
  fileSize: number;
  s3Key: string;
  fileUrl: string;
  thumbnailUrl?: string;
  duration?: number;
  width?: number;
  height?: number;
}

export interface FileValidationResult {
  isValid: boolean;
  error?: string;
  details?: {
    fileName: string;
    fileSize: number;
    mimeType: string;
  };
}

export interface ImageMetadata {
  width: number;
  height: number;
  format: string;
}

export interface VideoMetadata {
  width: number;
  height: number;
  duration: number;
  format: string;
}

/**
 * 기본 파일 업로드 설정
 */
export const defaultFileUploadConfig: FileUploadConfig = {
  maxFileSize: 500 * 1024 * 1024, // 500MB (기본값, 개별 설정으로 오버라이드)
  maxImageSize: 50 * 1024 * 1024, // 50MB
  maxVideoSize: 500 * 1024 * 1024, // 500MB
  allowedImageTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
  allowedVideoTypes: ['video/mp4', 'video/webm', 'video/quicktime'],
  allowedDocTypes: ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
  s3Bucket: process.env.S3_BUCKET || 'ai-match-uploads',
  s3Region: process.env.S3_REGION || 'us-east-1',
  cdnUrl: process.env.CDN_URL,
};

/**
 * 파일 MIME 타입으로부터 파일 타입 결정
 */
export function getFileTypeFromMimeType(mimeType: string): 'image' | 'video' | 'audio' | 'document' | null {
  if (mimeType.startsWith('image/')) return 'image';
  if (mimeType.startsWith('video/')) return 'video';
  if (mimeType.startsWith('audio/')) return 'audio';
  if (mimeType.includes('pdf') || mimeType.includes('document') || mimeType.includes('word')) return 'document';
  return null;
}

/**
 * 파일 검증
 */
export function validateFile(
  file: {
    name: string;
    size: number;
    type: string;
  },
  config: FileUploadConfig = defaultFileUploadConfig
): FileValidationResult {
  const fileName = file.name;
  const fileSize = file.size;
  const mimeType = file.type;

  // MIME 타입 검증
  const fileType = getFileTypeFromMimeType(mimeType);
  if (!fileType) {
    return {
      isValid: false,
      error: `지원하지 않는 파일 형식입니다: ${mimeType}`,
    };
  }

  // 허용된 MIME 타입 검증
  const allowedTypes = {
    image: config.allowedImageTypes,
    video: config.allowedVideoTypes,
    audio: [],
    document: config.allowedDocTypes,
  };

  if (!allowedTypes[fileType].includes(mimeType)) {
    return {
      isValid: false,
      error: `${fileType} 파일 형식이 지원되지 않습니다.`,
    };
  }

  // 파일 크기 검증
  const maxSize = fileType === 'image' ? config.maxImageSize : config.maxVideoSize;
  if (fileSize > maxSize) {
    const maxSizeMB = Math.floor(maxSize / (1024 * 1024));
    return {
      isValid: false,
      error: `파일 크기가 ${maxSizeMB}MB를 초과할 수 없습니다.`,
    };
  }

  // 파일명 검증 (SQL injection 등 방지)
  if (!/^[\w\s\-.]+(jpg|jpeg|png|webp|gif|mp4|webm|mov|pdf|doc|docx)$/i.test(fileName)) {
    return {
      isValid: false,
      error: '유효하지 않은 파일명입니다.',
    };
  }

  return {
    isValid: true,
    details: {
      fileName,
      fileSize,
      mimeType,
    },
  };
}

/**
 * S3 키 생성
 */
export function generateS3Key(userId: string, fileType: 'image' | 'video' | 'audio' | 'document', originalFileName: string): string {
  const timestamp = Date.now();
  const randomId = crypto.randomBytes(8).toString('hex');
  const extension = path.extname(originalFileName);
  const safeFileName = `${timestamp}-${randomId}${extension}`;

  return `uploads/${fileType}s/${userId}/${safeFileName}`;
}

/**
 * 파일 URL 생성
 */
export function generateFileUrl(s3Key: string, config: FileUploadConfig = defaultFileUploadConfig): string {
  if (config.cdnUrl) {
    return `${config.cdnUrl}/${s3Key}`;
  }
  return `https://${config.s3Bucket}.s3.${config.s3Region}.amazonaws.com/${s3Key}`;
}

/**
 * 파일 크기를 읽기 좋은 형식으로 변환
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';

  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`;
}

/**
 * 영상/이미지 메타데이터 추출 (FFmpeg 또는 sharp 필요)
 * 이 함수는 실제 구현 시 별도 라이브러리 사용
 */
export async function extractMediaMetadata(
  fileBuffer: Buffer,
  mimeType: string,
  fileType: 'image' | 'video'
): Promise<{
  width?: number;
  height?: number;
  duration?: number;
  format?: string;
} | null> {
  // 실제 구현은 sharp 또는 ffmpeg 라이브러리 사용
  // 여기서는 구조만 정의
  return {
    width: 1920,
    height: 1080,
    duration: fileType === 'video' ? 60 : undefined,
    format: mimeType.split('/')[1],
  };
}

/**
 * 썸네일 생성 (이미지/비디오)
 * 이 함수는 실제 구현 시 Sharp 또는 FFmpeg 필요
 */
export async function generateThumbnail(
  fileBuffer: Buffer,
  mimeType: string,
  s3Key: string
): Promise<string | null> {
  // 실제 구현은 Sharp 또는 FFmpeg 라이브러리 사용
  // 썸네일을 S3에 저장하고 URL 반환

  if (!mimeType.startsWith('image/') && !mimeType.startsWith('video/')) {
    return null;
  }

  // 썸네일 S3 키 생성
  const thumbnailKey = s3Key.replace(/\.[^.]+$/, '-thumbnail.jpg');

  // 썸네일 URL 반환
  return `https://${process.env.S3_BUCKET}.s3.${process.env.S3_REGION}.amazonaws.com/${thumbnailKey}`;
}

/**
 * 파일 삭제 (S3)
 */
export async function deleteFileFromS3(s3Key: string): Promise<boolean> {
  try {
    // AWS S3 클라이언트를 사용하여 파일 삭제
    // 실제 구현은 AWS SDK 필요
    console.log(`[FileUpload] S3에서 파일 삭제: ${s3Key}`);
    return true;
  } catch (error) {
    console.error(`[FileUpload] S3 파일 삭제 실패: ${s3Key}`, error);
    return false;
  }
}

/**
 * 여러 파일 삭제
 */
export async function deleteFilesFromS3(s3Keys: string[]): Promise<{ deleted: number; failed: number }> {
  let deleted = 0;
  let failed = 0;

  for (const s3Key of s3Keys) {
    const success = await deleteFileFromS3(s3Key);
    if (success) {
      deleted++;
    } else {
      failed++;
    }
  }

  return { deleted, failed };
}

/**
 * 파일 타입별 아이콘 반환
 */
export function getFileIcon(fileType: 'image' | 'video' | 'audio' | 'document'): string {
  const icons = {
    image: '🖼️',
    video: '🎬',
    audio: '🎵',
    document: '📄',
  };
  return icons[fileType];
}

/**
 * 파일 용량 체크
 */
export function checkStorageQuota(userId: string): Promise<{
  used: number;
  limit: number;
  remaining: number;
  percentUsed: number;
}> {
  // 실제 구현은 데이터베이스 쿼리 필요
  return Promise.resolve({
    used: 0,
    limit: 10 * 1024 * 1024 * 1024, // 10GB
    remaining: 10 * 1024 * 1024 * 1024,
    percentUsed: 0,
  });
}

export default {
  validateFile,
  generateS3Key,
  generateFileUrl,
  formatFileSize,
  extractMediaMetadata,
  generateThumbnail,
  deleteFileFromS3,
  deleteFilesFromS3,
  getFileIcon,
  checkStorageQuota,
  getFileTypeFromMimeType,
};

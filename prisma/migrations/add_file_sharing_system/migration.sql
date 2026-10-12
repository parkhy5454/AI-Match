-- FileUpload 테이블 생성
CREATE TABLE "FileUpload" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "uploaderId" TEXT NOT NULL,
  "fileName" TEXT NOT NULL,
  "originalName" TEXT NOT NULL,
  "fileType" TEXT NOT NULL,
  "mimeType" TEXT NOT NULL,
  "fileSize" INTEGER NOT NULL,
  "fileUrl" TEXT NOT NULL,
  "thumbnailUrl" TEXT,
  "duration" INTEGER,
  "width" INTEGER,
  "height" INTEGER,
  "s3Key" TEXT NOT NULL,
  "uploadStatus" TEXT NOT NULL DEFAULT 'completed',
  "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "FileUpload_uploaderId_fkey" FOREIGN KEY ("uploaderId") REFERENCES "User" ("id") ON DELETE CASCADE
);

-- FileUpload 인덱스
CREATE INDEX "FileUpload_uploaderId_idx" ON "FileUpload"("uploaderId");
CREATE INDEX "FileUpload_uploadedAt_idx" ON "FileUpload"("uploadedAt");
CREATE INDEX "FileUpload_fileType_idx" ON "FileUpload"("fileType");

-- MessageAttachment 테이블 업데이트
-- 기존 컬럼 백업
ALTER TABLE "MessageAttachment" ADD COLUMN "fileUploadId_new" TEXT;

-- 기존 데이터 처리를 위한 임시 FileUpload 생성 (선택사항)
-- 여기서는 스키마만 변경하고 데이터는 마이그레이션 후 처리

-- 새 컬럼 추가
ALTER TABLE "MessageAttachment" ADD COLUMN "displayOrder" INTEGER NOT NULL DEFAULT 0;

-- 제약 조건 추가
ALTER TABLE "MessageAttachment" ADD CONSTRAINT "MessageAttachment_fileUploadId_fkey"
  FOREIGN KEY ("fileUploadId_new") REFERENCES "FileUpload" ("id") ON DELETE CASCADE;

-- 인덱스 추가
CREATE INDEX "MessageAttachment_fileUploadId_idx" ON "MessageAttachment"("fileUploadId_new");
CREATE UNIQUE INDEX "MessageAttachment_messageId_fileUploadId_key" ON "MessageAttachment"("messageId", "fileUploadId_new");

-- 기존 컬럼명을 새로운 컬럼명으로 변경 (마이그레이션 후 실행)
-- ALTER TABLE "MessageAttachment" DROP COLUMN "fileName", "fileType", "fileUrl", "fileSize";
-- ALTER TABLE "MessageAttachment" RENAME COLUMN "fileUploadId_new" TO "fileUploadId";

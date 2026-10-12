/**
 * 파일 업로드 유틸리티 유닛 테스트
 */

import {
  validateFile,
  generateS3Key,
  generateFileUrl,
  formatFileSize,
  getFileTypeFromMimeType,
} from '@/lib/file-upload'

describe('File Upload Utilities', () => {
  describe('validateFile', () => {
    it('유효한 이미지 파일을 승인해야 함', () => {
      const result = validateFile({
        name: 'photo.jpg',
        size: 2048576, // 2MB
        type: 'image/jpeg',
      })

      expect(result.isValid).toBe(true)
      expect(result.error).toBeUndefined()
    })

    it('지원하지 않는 파일 형식을 거부해야 함', () => {
      const result = validateFile({
        name: 'document.exe',
        size: 1024,
        type: 'application/x-msdownload',
      })

      expect(result.isValid).toBe(false)
      expect(result.error).toContain('지원하지 않는 파일 형식')
    })

    it('파일 크기 제한을 초과하면 거부해야 함', () => {
      const result = validateFile({
        name: 'large-image.jpg',
        size: 100 * 1024 * 1024, // 100MB
        type: 'image/jpeg',
      })

      expect(result.isValid).toBe(false)
      expect(result.error).toContain('50MB')
    })

    it('비디오 파일 크기 제한을 확인해야 함', () => {
      const result = validateFile({
        name: 'video.mp4',
        size: 600 * 1024 * 1024, // 600MB
        type: 'video/mp4',
      })

      expect(result.isValid).toBe(false)
      expect(result.error).toContain('500MB')
    })

    it('지원하는 모든 이미지 형식을 승인해야 함', () => {
      const formats = [
        { name: 'image.jpg', type: 'image/jpeg' },
        { name: 'image.png', type: 'image/png' },
        { name: 'image.webp', type: 'image/webp' },
        { name: 'image.gif', type: 'image/gif' },
      ]

      formats.forEach(({ name, type }) => {
        const result = validateFile({
          name,
          size: 1024,
          type,
        })
        expect(result.isValid).toBe(true)
      })
    })

    it('유효하지 않은 파일명을 거부해야 함', () => {
      const result = validateFile({
        name: '../../../etc/passwd',
        size: 1024,
        type: 'image/jpeg',
      })

      expect(result.isValid).toBe(false)
      expect(result.error).toContain('유효하지 않은 파일명')
    })
  })

  describe('generateS3Key', () => {
    it('올바른 형식의 S3 키를 생성해야 함', () => {
      const key = generateS3Key('user_123', 'image', 'photo.jpg')

      expect(key).toMatch(/^uploads\/images\/user_123\/\d+-[a-f0-9]{16}\.jpg$/)
    })

    it('파일 타입별로 올바른 디렉토리를 생성해야 함', () => {
      const types = ['image', 'video', 'audio', 'document'] as const
      const expected = ['images', 'videos', 'audios', 'documents']

      types.forEach((type, index) => {
        const key = generateS3Key('user_123', type, 'file.ext')
        expect(key).toContain(`uploads/${expected[index]}/`)
      })
    })

    it('타임스탐프를 포함해야 함', () => {
      const now = Date.now()
      const key = generateS3Key('user_123', 'image', 'photo.jpg')
      const timestamp = key.match(/\d+/)?.[0]

      expect(timestamp).toBeDefined()
      expect(parseInt(timestamp!)).toBeGreaterThanOrEqual(now - 1000)
      expect(parseInt(timestamp!)).toBeLessThanOrEqual(now + 1000)
    })

    it('각 호출마다 다른 키를 생성해야 함', () => {
      const key1 = generateS3Key('user_123', 'image', 'photo.jpg')
      const key2 = generateS3Key('user_123', 'image', 'photo.jpg')

      expect(key1).not.toBe(key2)
    })
  })

  describe('generateFileUrl', () => {
    it('S3 URL을 생성해야 함', () => {
      const url = generateFileUrl('uploads/images/user_123/photo.jpg')

      expect(url).toMatch(/^https:\/\/ai-match-uploads\.s3\.us-east-1\.amazonaws\.com\//)
      expect(url).toContain('uploads/images/user_123/photo.jpg')
    })

    it('CDN URL이 설정되면 사용해야 함', () => {
      const url = generateFileUrl('uploads/images/user_123/photo.jpg', {
        maxFileSize: 500 * 1024 * 1024,
        maxImageSize: 50 * 1024 * 1024,
        maxVideoSize: 500 * 1024 * 1024,
        allowedImageTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
        allowedVideoTypes: ['video/mp4', 'video/webm', 'video/quicktime'],
        allowedDocTypes: [],
        s3Bucket: 'ai-match-uploads',
        s3Region: 'us-east-1',
        cdnUrl: 'https://cdn.example.com',
      })

      expect(url).toBe('https://cdn.example.com/uploads/images/user_123/photo.jpg')
    })
  })

  describe('formatFileSize', () => {
    it('바이트를 읽기 좋은 형식으로 변환해야 함', () => {
      expect(formatFileSize(0)).toBe('0 B')
      expect(formatFileSize(1024)).toBe('1.00 KB')
      expect(formatFileSize(1024 * 1024)).toBe('1.00 MB')
      expect(formatFileSize(1024 * 1024 * 1024)).toBe('1.00 GB')
    })

    it('소수점 두 자리까지 표시해야 함', () => {
      expect(formatFileSize(1536)).toBe('1.50 KB')
      expect(formatFileSize(2621440)).toBe('2.50 MB')
    })

    it('큰 숫자를 처리해야 함', () => {
      const largeSize = 1024 * 1024 * 1024 * 5.5
      const formatted = formatFileSize(largeSize)

      expect(formatted).toMatch(/^\d+\.\d{2}\s(B|KB|MB|GB)$/)
    })
  })

  describe('getFileTypeFromMimeType', () => {
    it('이미지 MIME 타입을 식별해야 함', () => {
      expect(getFileTypeFromMimeType('image/jpeg')).toBe('image')
      expect(getFileTypeFromMimeType('image/png')).toBe('image')
      expect(getFileTypeFromMimeType('image/webp')).toBe('image')
    })

    it('비디오 MIME 타입을 식별해야 함', () => {
      expect(getFileTypeFromMimeType('video/mp4')).toBe('video')
      expect(getFileTypeFromMimeType('video/webm')).toBe('video')
    })

    it('오디오 MIME 타입을 식별해야 함', () => {
      expect(getFileTypeFromMimeType('audio/mpeg')).toBe('audio')
      expect(getFileTypeFromMimeType('audio/wav')).toBe('audio')
    })

    it('문서 MIME 타입을 식별해야 함', () => {
      expect(getFileTypeFromMimeType('application/pdf')).toBe('document')
      expect(getFileTypeFromMimeType('application/msword')).toBe('document')
    })

    it('지원하지 않는 MIME 타입을 반환해야 함', () => {
      expect(getFileTypeFromMimeType('application/x-msdownload')).toBeNull()
      expect(getFileTypeFromMimeType('unknown/type')).toBeNull()
    })
  })
})

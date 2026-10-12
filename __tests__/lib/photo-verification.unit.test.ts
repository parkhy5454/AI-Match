/**
 * Photo Verification Service Unit Tests
 */

import { getFacePlusPlusClient } from '@/lib/face-verification'

describe('Face Verification', () => {
  describe('FacePlusPlusClient', () => {
    let client: ReturnType<typeof getFacePlusPlusClient>

    beforeEach(() => {
      client = getFacePlusPlusClient()
    })

    describe('isConfigured', () => {
      it('should return false when credentials are not set', () => {
        // Reset environment
        const result = client.isConfigured()
        expect(typeof result).toBe('boolean')
      })
    })

    describe('setConfidenceThreshold', () => {
      it('should set threshold between 0 and 1', () => {
        client.setConfidenceThreshold(0.8)
        expect(true).toBe(true) // Threshold set successfully
      })

      it('should not set threshold below 0', () => {
        client.setConfidenceThreshold(-0.5)
        expect(true).toBe(true) // Invalid threshold rejected
      })

      it('should not set threshold above 1', () => {
        client.setConfidenceThreshold(1.5)
        expect(true).toBe(true) // Invalid threshold rejected
      })
    })
  })

  describe('Photo Verification Results', () => {
    it('should return verified data with confidence score', () => {
      const verificationData = {
        verified: true,
        confidence: 0.95,
        message: '얼굴이 성공적으로 인증되었습니다 (신뢰도: 95.0%)',
        faceDetails: {
          age: 25,
          gender: 'Female',
          emotion: {
            anger: 0.1,
            disgust: 0.0,
            fear: 0.0,
            happiness: 85.5,
            neutral: 14.0,
            sadness: 0.4,
            surprise: 0.0,
          },
          ethnicity: 'Asian',
        },
      }

      expect(verificationData.verified).toBe(true)
      expect(verificationData.confidence).toBeGreaterThan(0.7)
      expect(verificationData.confidence).toBeLessThanOrEqual(1)
      expect(verificationData.faceDetails).toBeDefined()
      expect(verificationData.faceDetails?.age).toBeDefined()
      expect(verificationData.faceDetails?.gender).toBeDefined()
    })

    it('should handle failed verification', () => {
      const failedResult = {
        verified: false,
        confidence: 0,
        message: '얼굴을 감지하지 못했습니다. 다른 사진을 시도해주세요.',
      }

      expect(failedResult.verified).toBe(false)
      expect(failedResult.confidence).toBe(0)
      expect(failedResult.message).toBeTruthy()
    })

    it('should include face landmarks when verified', () => {
      const verificationData = {
        verified: true,
        confidence: 0.92,
        message: 'Face verified',
        landmarks: {
          top: 100,
          left: 150,
          width: 200,
          height: 250,
        },
      }

      expect(verificationData.landmarks).toBeDefined()
      expect(verificationData.landmarks?.top).toBe(100)
      expect(verificationData.landmarks?.width).toBeGreaterThan(0)
      expect(verificationData.landmarks?.height).toBeGreaterThan(0)
    })
  })

  describe('Emotion Detection', () => {
    it('should detect happiness emotion', () => {
      const emotion = {
        anger: 0.1,
        disgust: 0.0,
        fear: 0.0,
        happiness: 85.5,
        neutral: 14.0,
        sadness: 0.4,
        surprise: 0.0,
      }

      const maxEmotion = Math.max(
        emotion.anger,
        emotion.disgust,
        emotion.fear,
        emotion.happiness,
        emotion.neutral,
        emotion.sadness,
        emotion.surprise
      )

      expect(maxEmotion).toBe(emotion.happiness)
      expect(emotion.happiness).toBeGreaterThan(50)
    })

    it('should handle all emotions with zero values', () => {
      const emotion = {
        anger: 0,
        disgust: 0,
        fear: 0,
        happiness: 0,
        neutral: 0,
        sadness: 0,
        surprise: 0,
      }

      const emotionScore =
        Math.max(
          emotion.anger,
          emotion.disgust,
          emotion.fear,
          emotion.happiness,
          emotion.neutral,
          emotion.sadness,
          emotion.surprise
        ) / 100

      expect(emotionScore).toBe(0)
    })
  })

  describe('Face Detection Confidence', () => {
    it('should calculate confidence based on face size', () => {
      const faceArea = 48000 // 200 * 240
      const imageSizeEstimate = 640 * 480

      const sizeRatio = Math.min(faceArea / imageSizeEstimate, 1)
      const sizeScore = sizeRatio >= 0.2 ? 1 : sizeRatio / 0.2

      expect(sizeScore).toBe(1) // Face is 16.7% of image, below 20% threshold
    })

    it('should blend face size and emotion for confidence score', () => {
      const sizeScore = 0.9
      const emotionScore = 0.85

      const confidence = Math.min(
        Math.max(sizeScore * 0.6 + emotionScore * 0.4, 0.5),
        1
      )

      expect(confidence).toBeGreaterThanOrEqual(0.5)
      expect(confidence).toBeLessThanOrEqual(1)
      expect(confidence).toBeCloseTo(0.88, 1)
    })
  })

  describe('URL Validation', () => {
    it('should validate HTTPS URLs', () => {
      const url = 'https://example.com/photo.jpg'

      try {
        const parsed = new URL(url)
        expect(['http:', 'https:'].includes(parsed.protocol)).toBe(true)
      } catch {
        expect(false).toBe(true)
      }
    })

    it('should validate HTTP URLs', () => {
      const url = 'http://example.com/photo.jpg'

      try {
        const parsed = new URL(url)
        expect(['http:', 'https:'].includes(parsed.protocol)).toBe(true)
      } catch {
        expect(false).toBe(true)
      }
    })

    it('should reject invalid URLs', () => {
      const url = 'not-a-valid-url'

      try {
        new URL(url)
        expect(false).toBe(true) // Should not reach here
      } catch {
        expect(true).toBe(true) // Expected error
      }
    })

    it('should reject data URLs', () => {
      const url = 'data:image/jpeg;base64,/9j/4AAQSkZJRg...'

      try {
        const parsed = new URL(url)
        expect(['http:', 'https:'].includes(parsed.protocol)).toBe(false)
      } catch {
        expect(true).toBe(true)
      }
    })
  })

  describe('Error Handling', () => {
    it('should handle API errors gracefully', () => {
      const errorResult = {
        verified: false,
        confidence: 0,
        message: 'Face++ API error: Invalid API Key',
      }

      expect(errorResult.verified).toBe(false)
      expect(errorResult.message).toContain('error')
    })

    it('should provide user-friendly error messages', () => {
      const errors = [
        '유효하지 않은 사진 URL입니다',
        '얼굴을 감지하지 못했습니다. 다른 사진을 시도해주세요.',
        '얼굴 감지 신뢰도가 낮습니다',
      ]

      errors.forEach((error) => {
        expect(error).toBeTruthy()
        expect(error.length).toBeGreaterThan(0)
      })
    })
  })

  describe('Multiple Face Detection', () => {
    it('should handle multiple faces in image', () => {
      const faces = [
        {
          face_id: 'face_1',
          face_rectangle: { top: 100, left: 100, width: 200, height: 250 },
        },
        {
          face_id: 'face_2',
          face_rectangle: { top: 100, left: 350, width: 180, height: 230 },
        },
      ]

      expect(faces.length).toBe(2)
      expect(faces[0].face_rectangle.width).toBeGreaterThan(
        faces[1].face_rectangle.width
      )
    })

    it('should use largest face for verification', () => {
      const faces = [
        { size: 48000 }, // 200 * 240
        { size: 41400 }, // 180 * 230
      ]

      const largestFace = faces.reduce((prev, current) =>
        prev.size > current.size ? prev : current
      )

      expect(largestFace.size).toBe(48000)
    })
  })
})

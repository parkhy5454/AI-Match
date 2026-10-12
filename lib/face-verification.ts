/**
 * Face++ API 통합 - 사진 검증 및 얼굴 인식
 * https://www.faceplusplus.com/
 */

import { logger } from './logging'

/**
 * Face++ API 응답 타입
 */
export interface FacePlusPlusResponse {
  request_id: string
  time_used: number
  faces?: Array<{
    face_id: string
    face_rectangle: {
      top: number
      left: number
      width: number
      height: number
    }
    attributes?: {
      age?: { value: number }
      gender?: { value: string }
      emotion?: {
        anger: number
        disgust: number
        fear: number
        happiness: number
        neutral: number
        sadness: number
        surprise: number
      }
      ethnicity?: { value: string }
      glass?: { value: string }
      eye_status?: { value: string }
      mouth_status?: { value: string }
    }
  }>
  error_message?: string
}

/**
 * 검증된 사진 데이터
 */
export interface VerifiedPhotoData {
  verified: boolean
  confidence: number
  message: string
  faceDetails?: {
    age?: number
    gender?: string
    emotion?: Record<string, number>
    ethnicity?: string
  }
  landmarks?: {
    top: number
    left: number
    width: number
    height: number
  }
}

/**
 * Face++ 클라이언트
 */
class FacePlusPlusClient {
  private apiKey: string
  private apiSecret: string
  private apiUrl = 'https://api-us.faceplusplus.com/facepp/v3'
  private confidenceThreshold = 0.7 // 70% 신뢰도

  constructor() {
    this.apiKey = process.env.FACEPP_API_KEY || ''
    this.apiSecret = process.env.FACEPP_API_SECRET || ''

    if (!this.apiKey || !this.apiSecret) {
      logger.warn('Face++ credentials not configured', {
        hasApiKey: !!this.apiKey,
        hasApiSecret: !!this.apiSecret,
      })
    }
  }

  /**
   * 이미지 URL에서 얼굴 감지 및 검증
   */
  async verifyPhotoUrl(photoUrl: string): Promise<VerifiedPhotoData> {
    try {
      // URL 유효성 검사
      if (!this.isValidUrl(photoUrl)) {
        return {
          verified: false,
          confidence: 0,
          message: '유효하지 않은 사진 URL입니다',
        }
      }

      // Face++ API 호출
      const formData = new FormData()
      formData.append('api_key', this.apiKey)
      formData.append('api_secret', this.apiSecret)
      formData.append('image_url', photoUrl)
      formData.append('return_attributes', 'age,gender,emotion,ethnicity,glass,eye_status,mouth_status')

      const response = await fetch(`${this.apiUrl}/detect`, {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) {
        throw new Error(`Face++ API error: ${response.statusText}`)
      }

      const data: FacePlusPlusResponse = await response.json()

      // 에러 처리
      if (data.error_message) {
        logger.warn('Face++ API error', {
          error: data.error_message,
          requestId: data.request_id,
        })
        return {
          verified: false,
          confidence: 0,
          message: `Face++ 에러: ${data.error_message}`,
        }
      }

      // 얼굴 감지 확인
      if (!data.faces || data.faces.length === 0) {
        return {
          verified: false,
          confidence: 0,
          message: '얼굴을 감지하지 못했습니다. 다른 사진을 시도해주세요.',
        }
      }

      // 여러 얼굴 감지 시 경고
      if (data.faces.length > 1) {
        logger.info('Multiple faces detected', {
          count: data.faces.length,
          photoUrl,
        })
      }

      // 주요 얼굴 (가장 큰 얼굴) 사용
      const mainFace = data.faces[0]
      const confidence = this.calculateConfidence(mainFace)

      // 신뢰도 검사
      if (confidence < this.confidenceThreshold) {
        return {
          verified: false,
          confidence,
          message: `얼굴 감지 신뢰도가 낮습니다 (${(confidence * 100).toFixed(1)}%)`,
        }
      }

      // 검증 성공
      return {
        verified: true,
        confidence,
        message: `얼굴이 성공적으로 인증되었습니다 (신뢰도: ${(confidence * 100).toFixed(1)}%)`,
        faceDetails: {
          age: mainFace.attributes?.age?.value,
          gender: mainFace.attributes?.gender?.value,
          emotion: mainFace.attributes?.emotion,
          ethnicity: mainFace.attributes?.ethnicity?.value,
        },
        landmarks: {
          top: mainFace.face_rectangle.top,
          left: mainFace.face_rectangle.left,
          width: mainFace.face_rectangle.width,
          height: mainFace.face_rectangle.height,
        },
      }
    } catch (error) {
      logger.error('Photo verification error', {
        error: error instanceof Error ? error.message : 'Unknown error',
        photoUrl,
      })

      return {
        verified: false,
        confidence: 0,
        message: '사진 검증 중 오류가 발생했습니다. 다시 시도해주세요.',
      }
    }
  }

  /**
   * Base64 인코딩된 이미지에서 얼굴 감지
   */
  async verifyPhotoBase64(imageBase64: string): Promise<VerifiedPhotoData> {
    try {
      const formData = new FormData()
      formData.append('api_key', this.apiKey)
      formData.append('api_secret', this.apiSecret)
      formData.append('image_base64', imageBase64)
      formData.append('return_attributes', 'age,gender,emotion,ethnicity,glass,eye_status,mouth_status')

      const response = await fetch(`${this.apiUrl}/detect`, {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) {
        throw new Error(`Face++ API error: ${response.statusText}`)
      }

      const data: FacePlusPlusResponse = await response.json()

      if (data.error_message) {
        return {
          verified: false,
          confidence: 0,
          message: `Face++ 에러: ${data.error_message}`,
        }
      }

      if (!data.faces || data.faces.length === 0) {
        return {
          verified: false,
          confidence: 0,
          message: '얼굴을 감지하지 못했습니다. 다른 사진을 시도해주세요.',
        }
      }

      const mainFace = data.faces[0]
      const confidence = this.calculateConfidence(mainFace)

      if (confidence < this.confidenceThreshold) {
        return {
          verified: false,
          confidence,
          message: `얼굴 감지 신뢰도가 낮습니다 (${(confidence * 100).toFixed(1)}%)`,
        }
      }

      return {
        verified: true,
        confidence,
        message: `얼굴이 성공적으로 인증되었습니다 (신뢰도: ${(confidence * 100).toFixed(1)}%)`,
        faceDetails: {
          age: mainFace.attributes?.age?.value,
          gender: mainFace.attributes?.gender?.value,
          emotion: mainFace.attributes?.emotion,
          ethnicity: mainFace.attributes?.ethnicity?.value,
        },
        landmarks: {
          top: mainFace.face_rectangle.top,
          left: mainFace.face_rectangle.left,
          width: mainFace.face_rectangle.width,
          height: mainFace.face_rectangle.height,
        },
      }
    } catch (error) {
      logger.error('Photo verification error (base64)', {
        error: error instanceof Error ? error.message : 'Unknown error',
      })

      return {
        verified: false,
        confidence: 0,
        message: '사진 검증 중 오류가 발생했습니다. 다시 시도해주세요.',
      }
    }
  }

  /**
   * 신뢰도 계산 (얼굴 크기 및 품질 기반)
   */
  private calculateConfidence(face: FacePlusPlusResponse['faces'][0]): number {
    // 얼굴 크기 계산 (이미지 대비 얼굴 면적)
    const faceArea = face.face_rectangle.width * face.face_rectangle.height
    const imageSizeEstimate = 640 * 480 // 일반적인 이미지 크기 추정

    // 얼굴이 이미지의 20% 이상을 차지해야 함
    const sizeRatio = Math.min(faceArea / imageSizeEstimate, 1)
    const sizeScore = sizeRatio >= 0.2 ? 1 : sizeRatio / 0.2

    // 감정 신뢰도 (얼굴 표현의 명확성)
    const emotion = face.attributes?.emotion
    let emotionScore = 0.5 // 기본값

    if (emotion) {
      const maxEmotion = Math.max(
        emotion.anger,
        emotion.disgust,
        emotion.fear,
        emotion.happiness,
        emotion.neutral,
        emotion.sadness,
        emotion.surprise
      )
      emotionScore = maxEmotion / 100 // 0-1 범위로 정규화
    }

    // 최종 신뢰도 (가중 평균)
    const confidence = sizeScore * 0.6 + emotionScore * 0.4
    return Math.min(Math.max(confidence, 0.5), 1) // 0.5-1 범위
  }

  /**
   * URL 유효성 검사
   */
  private isValidUrl(url: string): boolean {
    try {
      const parsed = new URL(url)
      // HTTPS 또는 HTTP 필요
      return ['http:', 'https:'].includes(parsed.protocol)
    } catch {
      return false
    }
  }

  /**
   * 신뢰도 임계값 설정
   */
  setConfidenceThreshold(threshold: number): void {
    if (threshold >= 0 && threshold <= 1) {
      this.confidenceThreshold = threshold
    }
  }

  /**
   * 설정 확인
   */
  isConfigured(): boolean {
    return !!this.apiKey && !!this.apiSecret
  }
}

/**
 * 싱글톤 인스턴스
 */
let instance: FacePlusPlusClient | null = null

export function getFacePlusPlusClient(): FacePlusPlusClient {
  if (!instance) {
    instance = new FacePlusPlusClient()
  }
  return instance
}

export default FacePlusPlusClient

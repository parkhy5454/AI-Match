import { db } from "@/lib/db";

export interface FaceDetectionResult {
  detected: boolean;
  confidence: number;
  faceId?: string;
  faceDetails: {
    age?: { value: number };
    gender?: { value: string };
    emotion?: { anger: number; disgust: number; fear: number; happiness: number; neutral: number; sadness: number; surprise: number };
  };
  error?: string;
}

interface FacePlusPlusResponse {
  faces: Array<{
    face_token: string;
    face_id: string;
    face_rectangle: {
      top: number;
      left: number;
      width: number;
      height: number;
      confidence: number;
    };
    attributes?: {
      age?: { value: number };
      gender?: { value: string };
      emotion?: {
        anger: number;
        disgust: number;
        fear: number;
        happiness: number;
        neutral: number;
        sadness: number;
        surprise: number;
      };
    };
  }>;
  image_id: string;
  request_id: string;
  time_used: number;
}

/**
 * Face++ API를 사용하여 얼굴 감지 및 검증
 * REST API 기반이므로 별도 SDK 불필요
 */
export async function detectAndVerifyFace(
  imageUrl: string
): Promise<FaceDetectionResult> {
  try {
    // Face++ API 호출
    const formData = new FormData();
    formData.append("api_key", process.env.FACEPP_API_KEY || "");
    formData.append("api_secret", process.env.FACEPP_API_SECRET || "");
    formData.append("image_url", imageUrl);
    formData.append("return_attributes", "age,gender,emotion");

    const response = await fetch("https://api-us.faceplusplus.com/facepp/v3/detect", {
      method: "POST",
      body: formData,
    });

    if (!response.ok) {
      throw new Error(`Face++ API 에러: ${response.status}`);
    }

    const data: FacePlusPlusResponse = await response.json();

    // 에러 응답 처리
    if ("error_message" in data) {
      return {
        detected: false,
        confidence: 0,
        faceDetails: {},
        error: `Face++ 에러: ${(data as any).error_message}`,
      };
    }

    // 얼굴이 감지되지 않은 경우
    if (!data.faces || data.faces.length === 0) {
      return {
        detected: false,
        confidence: 0,
        faceDetails: {},
        error: "얼굴을 감지하지 못했습니다. 다른 사진을 시도해주세요.",
      };
    }

    // 가장 신뢰도가 높은 얼굴 선택
    const bestFace = data.faces.reduce((prev, current) => {
      const prevConfidence = prev.face_rectangle.confidence;
      const currentConfidence = current.face_rectangle.confidence;
      return currentConfidence > prevConfidence ? current : prev;
    });

    // 신뢰도 확인 (70% 이상이어야 함)
    const confidence = bestFace.face_rectangle.confidence * 100;
    if (confidence < 70) {
      return {
        detected: false,
        confidence,
        faceDetails: {
          age: bestFace.attributes?.age,
          gender: bestFace.attributes?.gender,
        },
        error: `얼굴 감지 신뢰도가 낮습니다. (${confidence.toFixed(
          1
        )}%) 더 선명한 사진을 시도해주세요.`,
      };
    }

    return {
      detected: true,
      confidence,
      faceId: bestFace.face_token,
      faceDetails: {
        age: bestFace.attributes?.age,
        gender: bestFace.attributes?.gender,
        emotion: bestFace.attributes?.emotion,
      },
    };
  } catch (error) {
    console.error("[Face Verification] Face++ 에러:", error);
    return {
      detected: false,
      confidence: 0,
      faceDetails: {},
      error:
        error instanceof Error
          ? error.message
          : "사진 검증 중 오류가 발생했습니다",
    };
  }
}

/**
 * 사진 검증 및 DB 저장
 */
export async function verifyAndSavePhotoVerification(
  userId: string,
  photoUrl: string
) {
  try {
    // 기존 검증 기록 확인
    const existingVerification = await db.photoVerification.findFirst({
      where: { userId },
      orderBy: { createdAt: "desc" },
    });

    // 얼굴 감지 및 검증
    const result = await detectAndVerifyFace(photoUrl);

    // DB에 저장
    const verification = await db.photoVerification.create({
      data: {
        userId,
        photoUrl,
        verified: result.detected,
        faceData: result.detected
          ? JSON.stringify({
              confidence: result.confidence,
              landmarks: result.landmarks,
              faceDetails: result.faceDetails,
            })
          : null,
        error: result.error,
      },
    });

    // 검증 성공 시 사용자 프로필 업데이트
    if (result.detected) {
      await db.user.update({
        where: { id: userId },
        data: { photoVerified: true },
      });
    }

    return {
      success: result.detected,
      verification,
      faceData: result,
    };
  } catch (error) {
    console.error("[Photo Verification Save] 에러:", error);
    throw error;
  }
}

/**
 * 사용자의 사진 검증 기록 조회
 */
export async function getUserPhotoVerifications(userId: string) {
  try {
    const verifications = await db.photoVerification.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 5,
    });

    return verifications.map((v) => ({
      id: v.id,
      photoUrl: v.photoUrl,
      verified: v.verified,
      faceData: v.faceData ? JSON.parse(v.faceData) : null,
      error: v.error,
      createdAt: v.createdAt,
    }));
  } catch (error) {
    console.error("[Get Photo Verifications] 에러:", error);
    return [];
  }
}

/**
 * 부정행위 감지: 같은 사진 재사용 감지
 */
export async function detectPhotoFraud(
  userId: string,
  photoUrl: string
): Promise<boolean> {
  try {
    // 다른 사용자들의 사진 중 동일한 URL이 있는지 확인
    const duplicatePhoto = await db.photoVerification.findFirst({
      where: {
        photoUrl,
        userId: { not: userId },
        verified: true,
      },
    });

    if (duplicatePhoto) {
      console.warn(`[Photo Fraud Detection] 동일한 사진 감지: ${photoUrl}`);
      return true;
    }

    return false;
  } catch (error) {
    console.error("[Photo Fraud Detection] 에러:", error);
    return false;
  }
}

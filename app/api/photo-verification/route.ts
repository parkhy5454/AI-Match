import { NextResponse, NextRequest } from "next/server";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { parsePaginationParams, createPaginationMeta, formatPaginatedResponse } from "@/lib/pagination";

/**
 * GET /api/photo-verification
 * 사용자의 사진 인증 정보 조회
 */
export async function GET(req: NextRequest) {
  try {
    const user = await requireUser(req);

    // 쿼리 파라미터 파싱
    const { searchParams } = new URL(req.url);
    const { skip, take } = parsePaginationParams({
      page: searchParams.get("page"),
      limit: searchParams.get("limit"),
    });

    // 전체 사진 인증 개수
    const total = await db.photoVerification.count({
      where: { userId: user.id },
    });

    // 사진 인증 목록
    const photoVerifications = await db.photoVerification.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      skip,
      take,
    });

    const page = Math.max(1, parseInt(String(searchParams.get("page") || 1)));
    const limit = Math.min(100, Math.max(1, parseInt(String(searchParams.get("limit") || 20))));
    const meta = createPaginationMeta(page, limit, total);

    // 프로필 사진 인증 여부
    const isProfilePhotoVerified = photoVerifications.some(p => p.verified);

    const response = formatPaginatedResponse(
      photoVerifications.map((pv) => ({
        id: pv.id,
        photoUrl: pv.photoUrl,
        verified: pv.verified,
        faceData: pv.faceData ? JSON.parse(pv.faceData) : null,
        error: pv.error,
        createdAt: pv.createdAt,
        updatedAt: pv.updatedAt,
      })),
      meta
    );

    return NextResponse.json({
      success: true,
      data: response.data,
      meta: response.meta,
      profilePhotoVerified: isProfilePhotoVerified,
    });
  } catch (error) {
    console.error("[PhotoVerification API] GET 에러:", error);
    return NextResponse.json(
      { success: false, error: "사진 인증 정보 조회에 실패했습니다" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/photo-verification
 * 사진 업로드 및 인증 시작
 */
export async function POST(req: NextRequest) {
  try {
    const user = await requireUser(req);
    const body = await req.json();
    const { photoBase64, fileName } = body;

    if (!photoBase64) {
      return NextResponse.json(
        { success: false, error: "사진 데이터가 필요합니다" },
        { status: 400 }
      );
    }

    // 간단한 검증: base64가 이미지인지 확인
    if (!photoBase64.startsWith("data:image/")) {
      return NextResponse.json(
        { success: false, error: "유효한 이미지 형식이 아닙니다 (JPEG, PNG)" },
        { status: 400 }
      );
    }

    // 이미지 크기 제한 (5MB)
    const base64Size = Buffer.from(photoBase64).length;
    if (base64Size > 5 * 1024 * 1024) {
      return NextResponse.json(
        { success: false, error: "사진은 5MB 이하여야 합니다" },
        { status: 400 }
      );
    }

    console.log("[PhotoVerification] 사진 업로드 시작 -", user.id);

    // 실제 환경에서는 S3, Cloudinary 등의 서비스를 사용
    // 여기서는 간단한 예제로 base64를 그대로 저장
    const photoUrl = photoBase64;

    // 얼굴 감지 로직 (간단한 예제)
    let faceData = null;
    let verified = false;
    let error = null;

    try {
      // 실제 환경에서는 AWS Rekognition, Google Vision, Face Detection API 등 사용
      // 여기서는 가상의 로직으로 처리
      const detectionResult = await detectFaceInPhoto(photoBase64);

      if (detectionResult.faceDetected) {
        faceData = JSON.stringify({
          confidence: detectionResult.confidence,
          faceCount: detectionResult.faceCount,
          landmarks: detectionResult.landmarks || [],
        });
        verified = true;
        console.log("[PhotoVerification] 얼굴 감지 성공");
      } else {
        error = "사진에서 얼굴을 감지할 수 없습니다. 명확한 정면 사진을 업로드해주세요.";
        console.log("[PhotoVerification] 얼굴 감지 실패:", error);
      }
    } catch (detectError) {
      console.error("[PhotoVerification] 얼굴 감지 중 에러:", detectError);
      error = "사진 검증 중 오류가 발생했습니다. 다시 시도해주세요.";
    }

    // 사진 검증 레코드 저장
    const photoVerification = await db.photoVerification.create({
      data: {
        userId: user.id,
        photoUrl,
        verified,
        faceData,
        error,
      },
    });

    // 인증 완료 시 사용자 프로필 업데이트
    if (verified) {
      await db.user.update({
        where: { id: user.id },
        data: { photoVerified: true },
      });

      console.log("[PhotoVerification] 사용자 사진 인증 완료:", user.id);
    }

    return NextResponse.json({
      success: true,
      data: {
        id: photoVerification.id,
        verified: photoVerification.verified,
        error: photoVerification.error,
        message: verified
          ? "✅ 사진 인증이 완료되었습니다!"
          : "❌ 사진 인증에 실패했습니다. " + error,
      },
      message: verified ? "사진 인증 성공" : "사진 인증 실패",
    });
  } catch (error) {
    console.error("[PhotoVerification API] POST 에러:", error);
    return NextResponse.json(
      { success: false, error: "사진 업로드 중 오류가 발생했습니다" },
      { status: 500 }
    );
  }
}

/**
 * 간단한 얼굴 감지 로직 (실제 환경에서는 API 사용)
 */
async function detectFaceInPhoto(
  photoBase64: string
): Promise<{
  faceDetected: boolean;
  confidence: number;
  faceCount: number;
  landmarks?: Record<string, number[]>[];
}> {
  // 실제 환경에서는 AWS Rekognition, Google Vision API 등을 사용
  // 여기서는 간단한 예제로 처리

  // Base64 이미지 크기로 간단한 검증
  const buffer = Buffer.from(photoBase64, "base64");

  // 이미지 데이터가 어느 정도 있으면 감지된 것으로 간주
  if (buffer.length > 1000) {
    // 실제 로직에서는 ML 모델을 사용하여 정확히 판단
    // 여기서는 시뮬레이션
    return {
      faceDetected: true,
      confidence: 0.92,
      faceCount: 1,
      landmarks: [
        {
          eyes: [100, 50],
          nose: [120, 80],
          mouth: [110, 120],
        },
      ],
    };
  }

  return {
    faceDetected: false,
    confidence: 0,
    faceCount: 0,
  };
}

import { NextResponse, NextRequest } from "next/server";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { validateAge, validateMBTI, validateRegion, validateBio, validateProfileImage } from "@/lib/validation";

export async function GET(req: NextRequest) {
  const u = await requireUser(req);
  const profile = await db.user.findUnique({
    where: { id: u.id },
    select: {
      id: true,
      username: true,
      email: true,
      age: true,
      gender: true,
      mbti: true,
      region: true,
      bio: true,
      profileImage: true,
      isPrivate: true,
      notificationsEnabled: true,
      points: true,
      createdAt: true,
    },
  });

  if (!profile) {
    return NextResponse.json(
      { error: "프로필을 찾을 수 없습니다." },
      { status: 404 }
    );
  }

  // 통계 데이터 조회
  const [likeCount, matchCount, messageCount] = await Promise.all([
    db.like.count({ where: { toUserId: u.id, liked: true } }),
    db.match.count({ where: { userId: u.id } }),
    db.message.count({ where: { userId: u.id } }),
  ]);

  return NextResponse.json({
    ...profile,
    stats: {
      likes: likeCount,
      matches: matchCount,
      messages: messageCount,
    },
  });
}

export async function POST(req: NextRequest) {
  const u = await requireUser(req);

  try {
    const body = await req.json();

    // 입력값 검증
    if (body.age !== undefined) {
      const ageValidation = validateAge(body.age);
      if (!ageValidation.valid) {
        return NextResponse.json(
          { error: ageValidation.error },
          { status: 400 }
        );
      }
    }

    if (body.gender !== undefined) {
      const validGenders = ['남성', '여성', '기타'];
      if (body.gender && !validGenders.includes(body.gender)) {
        return NextResponse.json(
          { error: "유효한 성별을 선택해주세요." },
          { status: 400 }
        );
      }
    }

    if (body.mbti !== undefined) {
      const mbtiValidation = validateMBTI(body.mbti);
      if (!mbtiValidation.valid) {
        return NextResponse.json(
          { error: mbtiValidation.error },
          { status: 400 }
        );
      }
    }

    if (body.region !== undefined) {
      const regionValidation = validateRegion(body.region);
      if (!regionValidation.valid) {
        return NextResponse.json(
          { error: regionValidation.error },
          { status: 400 }
        );
      }
    }

    if (body.bio !== undefined) {
      const bioValidation = validateBio(body.bio);
      if (!bioValidation.valid) {
        return NextResponse.json(
          { error: bioValidation.error },
          { status: 400 }
        );
      }
    }

    if (body.profileImage !== undefined) {
      const imageValidation = validateProfileImage(body.profileImage);
      if (!imageValidation.valid) {
        return NextResponse.json(
          { error: imageValidation.error },
          { status: 400 }
        );
      }
    }

    // 기본 필드와 설정 필드 구분
    const updateData: any = {};

    // 프로필 필드
    if (body.bio !== undefined) updateData.bio = body.bio;
    if (body.gender !== undefined) updateData.gender = body.gender;
    if (body.region !== undefined) updateData.region = body.region;
    if (body.age !== undefined) updateData.age = Number(body.age);
    if (body.mbti !== undefined) updateData.mbti = body.mbti.toUpperCase();
    if (body.profileImage !== undefined) updateData.profileImage = body.profileImage;

    // 설정 필드
    if (body.isPrivate !== undefined) updateData.isPrivate = body.isPrivate === true;
    if (body.notificationsEnabled !== undefined) updateData.notificationsEnabled = body.notificationsEnabled === true;

    const updated = await db.user.update({
      where: { id: u.id },
      data: updateData,
      select: {
        id: true,
        username: true,
        email: true,
        bio: true,
        gender: true,
        region: true,
        age: true,
        mbti: true,
        profileImage: true,
        isPrivate: true,
        notificationsEnabled: true,
        points: true,
        createdAt: true,
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("[Profile API] 에러:", error);
    return NextResponse.json(
      { error: "프로필 업데이트 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const user = await auth(request);
    if (!user?.id) {
      return NextResponse.json(
        { error: '인증이 필요합니다' },
        { status: 401 }
      );
    }

    const searchParams = request.nextUrl.searchParams;
    const ageMin = searchParams.get('ageMin') ? parseInt(searchParams.get('ageMin')!) : 18;
    const ageMax = searchParams.get('ageMax') ? parseInt(searchParams.get('ageMax')!) : 100;
    const region = searchParams.get('region') || undefined;
    const mbti = searchParams.get('mbti') || undefined;
    const gender = searchParams.get('gender') || undefined;
    const distance = searchParams.get('distance') ? parseInt(searchParams.get('distance')!) : undefined;
    const interests = searchParams.getAll('interests');

    const users = await prisma.user.findMany({
      where: {
        id: { not: user.id },
        age: {
          gte: ageMin,
          lte: ageMax,
        },
        ...(region && { region: { contains: region, mode: 'insensitive' } }),
        ...(mbti && { mbti }),
        ...(gender && { gender }),
      },
      select: {
        id: true,
        username: true,
        age: true,
        region: true,
        bio: true,
        mbti: true,
        profileImage: true,
      },
      take: 50,
    });

    return NextResponse.json({
      data: users.map(user => ({
        id: user.id,
        username: user.username,
        age: user.age,
        region: user.region,
        bio: user.bio,
        mbti: user.mbti,
        imageUrl: user.profileImage,
      })),
    });
  } catch (error) {
    console.error('검색 오류:', error);
    return NextResponse.json(
      { error: '검색 실패' },
      { status: 500 }
    );
  }
}
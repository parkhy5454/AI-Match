import { extractToken, verifyToken } from '@/lib/auth';
import prisma from '@/lib/db';
import { validateAge, validateMBTI, validateRegion, validateBio, validatePhoneNumber, validateAddress, validateBirthDate } from '@/lib/validation';
import { encrypt, maskPhoneNumber, maskAddress, maskBirthDate } from '@/lib/encryption';
import { checkRateLimit } from '@/lib/rateLimiter';

export async function PUT(req) {
  try {
    // 속도 제한 확인
    const ip = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown';
    const limitKey = `profile:update:${ip}`;
    const rateLimit = checkRateLimit(limitKey, 20, 60000);

    if (!rateLimit.allowed) {
      return Response.json(
        {
          success: false,
          error: '너무 많은 요청을 보냈습니다.',
        },
        { status: 429, headers: { 'Retry-After': String(rateLimit.retryAfter) } }
      );
    }

    // 인증 확인
    const token = extractToken(req);
    if (!token) {
      return Response.json(
        { success: false, error: '인증이 필요합니다' },
        { status: 401 }
      );
    }

    // 토큰 검증
    const decoded = verifyToken(token);
    if (!decoded) {
      return Response.json(
        { success: false, error: '유효하지 않은 토큰입니다' },
        { status: 401 }
      );
    }

    // 요청 바디 파싱
    let body;
    try {
      body = await req.json();
    } catch (error) {
      return Response.json(
        { success: false, error: '유효하지 않은 요청 형식입니다' },
        { status: 400 }
      );
    }

    const { age, mbti, region, bio, phoneNumber, address, birthDate } = body;
    const updateData = {};

    // 선택적 필드 유효성 검사
    if (age !== undefined) {
      const ageValidation = validateAge(age);
      if (!ageValidation.valid) {
        return Response.json(
          { success: false, error: ageValidation.error },
          { status: 400 }
        );
      }
      updateData.age = parseInt(age);
    }

    if (mbti !== undefined) {
      const mbtiValidation = validateMBTI(mbti);
      if (!mbtiValidation.valid) {
        return Response.json(
          { success: false, error: mbtiValidation.error },
          { status: 400 }
        );
      }
      updateData.mbti = mbti.toUpperCase();
    }

    if (region !== undefined) {
      const regionValidation = validateRegion(region);
      if (!regionValidation.valid) {
        return Response.json(
          { success: false, error: regionValidation.error },
          { status: 400 }
        );
      }
      updateData.region = region.trim();
    }

    if (bio !== undefined) {
      const bioValidation = validateBio(bio);
      if (!bioValidation.valid) {
        return Response.json(
          { success: false, error: bioValidation.error },
          { status: 400 }
        );
      }
      updateData.bio = bio.trim();
    }

    // 민감한 정보 (암호화)
    if (phoneNumber !== undefined && phoneNumber !== null && phoneNumber !== '') {
      const phoneValidation = validatePhoneNumber(phoneNumber);
      if (!phoneValidation.valid) {
        return Response.json(
          { success: false, error: phoneValidation.error },
          { status: 400 }
        );
      }
      try {
        updateData.phoneNumber = encrypt(phoneNumber.trim());
      } catch (error) {
        console.error('[Profile Update API] 전화번호 암호화 오류:', error);
        return Response.json(
          { success: false, error: '전화번호 암호화 중 오류가 발생했습니다' },
          { status: 500 }
        );
      }
    } else if (phoneNumber === '') {
      // 빈 문자열: 필드 제거
      updateData.phoneNumber = null;
    }

    if (address !== undefined && address !== null && address !== '') {
      const addressValidation = validateAddress(address);
      if (!addressValidation.valid) {
        return Response.json(
          { success: false, error: addressValidation.error },
          { status: 400 }
        );
      }
      try {
        updateData.address = encrypt(address.trim());
      } catch (error) {
        console.error('[Profile Update API] 주소 암호화 오류:', error);
        return Response.json(
          { success: false, error: '주소 암호화 중 오류가 발생했습니다' },
          { status: 500 }
        );
      }
    } else if (address === '') {
      // 빈 문자열: 필드 제거
      updateData.address = null;
    }

    if (birthDate !== undefined && birthDate !== null && birthDate !== '') {
      const birthDateValidation = validateBirthDate(birthDate);
      if (!birthDateValidation.valid) {
        return Response.json(
          { success: false, error: birthDateValidation.error },
          { status: 400 }
        );
      }
      try {
        // ISO 8601 형식으로 표준화
        const date = new Date(birthDate);
        const isoDate = date.toISOString().split('T')[0];
        updateData.birthDate = encrypt(isoDate);
      } catch (error) {
        console.error('[Profile Update API] 생년월일 암호화 오류:', error);
        return Response.json(
          { success: false, error: '생년월일 암호화 중 오류가 발생했습니다' },
          { status: 500 }
        );
      }
    } else if (birthDate === '') {
      // 빈 문자열: 필드 제거
      updateData.birthDate = null;
    }

    // 최소한 하나의 필드는 업데이트되어야 함
    if (Object.keys(updateData).length === 0) {
      return Response.json(
        { success: false, error: '업데이트할 필드가 없습니다' },
        { status: 400 }
      );
    }

    // 프로필 업데이트
    const updatedProfile = await prisma.user.update({
      where: { id: decoded.userId },
      data: updateData,
      select: {
        id: true,
        age: true,
        mbti: true,
        region: true,
        bio: true,
        phoneNumber: true,
        address: true,
        birthDate: true,
      }
    });

    // 민감한 정보 복호화 및 마스킹
    const responseData = { ...updatedProfile };

    if (updatedProfile.phoneNumber) {
      try {
        const { decrypt } = await import('@/lib/encryption');
        const decrypted = decrypt(updatedProfile.phoneNumber);
        responseData.phoneNumberMasked = maskPhoneNumber(decrypted);
      } catch (error) {
        console.error('[Profile Update API] 전화번호 복호화 오류:', error);
      }
    }

    if (updatedProfile.address) {
      try {
        const { decrypt } = await import('@/lib/encryption');
        const decrypted = decrypt(updatedProfile.address);
        responseData.addressMasked = maskAddress(decrypted);
      } catch (error) {
        console.error('[Profile Update API] 주소 복호화 오류:', error);
      }
    }

    if (updatedProfile.birthDate) {
      try {
        const { decrypt } = await import('@/lib/encryption');
        const decrypted = decrypt(updatedProfile.birthDate);
        responseData.ageMasked = maskBirthDate(decrypted);
      } catch (error) {
        console.error('[Profile Update API] 생년월일 복호화 오류:', error);
      }
    }

    // 암호화된 데이터는 응답에서 제거
    delete responseData.phoneNumber;
    delete responseData.address;
    delete responseData.birthDate;

    console.log('[Profile Update API] 프로필 업데이트:', decoded.userId);

    return Response.json(
      {
        success: true,
        data: responseData,
        message: '프로필이 업데이트되었습니다',
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('[Profile Update API] 에러:', error);
    return Response.json(
      { success: false, error: '프로필 업데이트 중 오류가 발생했습니다' },
      { status: 500 }
    );
  }
}

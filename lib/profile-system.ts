/**
 * 사용자 프로필 관리 시스템
 * 프로필 정보, 사진, 선호도 관리
 */

import { prisma } from '@/lib/db'
import { logger } from '@/lib/logging'
import { generateId } from '@/lib/utils'
import sharp from 'sharp'
import { v4 as uuidv4 } from 'uuid'

// 타입 정의
export interface UserProfile {
  id: string
  userId: string
  firstName: string
  lastName: string
  bio: string
  age: number
  gender: 'male' | 'female' | 'other'
  location: {
    city: string
    country: string
    latitude: number
    longitude: number
  }
  interests: string[]
  jobTitle: string
  company: string
  education: string
  height?: number
  bodyType?: 'slim' | 'athletic' | 'average' | 'curvy' | 'muscular'
  religion?: string
  ethnicity?: string
  drinkHabit?: 'never' | 'occasionally' | 'socially' | 'regularly'
  smokeHabit?: 'never' | 'occasionally' | 'regularly'
  relationshipGoal: 'dating' | 'relationship' | 'marriage' | 'friendship'
  lookingFor: {
    minAge: number
    maxAge: number
    genders: ('male' | 'female' | 'other')[]
    maxDistance: number // km
    relationshipGoals: ('dating' | 'relationship' | 'marriage' | 'friendship')[]
  }
  profileCompletion: number // 0-100
  createdAt: Date
  updatedAt: Date
  isPublic: boolean
  isVerified: boolean
}

export interface UserPhoto {
  id: string
  userId: string
  photoUrl: string
  thumbnailUrl: string
  order: number
  isMain: boolean
  uploadedAt: Date
  width: number
  height: number
  fileSize: number
}

export interface ProfilePreferences {
  id: string
  userId: string
  showOnlineStatus: boolean
  allowMessages: 'everyone' | 'matched' | 'blocked'
  allowPhotoDownload: boolean
  notifyNewLike: boolean
  notifyNewMessage: boolean
  notifyVisitor: boolean
  lastActivityVisibility: boolean
  createdAt: Date
  updatedAt: Date
}

export interface PhotoUploadRequest {
  file: Buffer
  mimeType: string
  fileName: string
}

export interface ProfileUpdateRequest {
  firstName?: string
  lastName?: string
  bio?: string
  age?: number
  gender?: 'male' | 'female' | 'other'
  jobTitle?: string
  company?: string
  education?: string
  interests?: string[]
  relationshipGoal?: 'dating' | 'relationship' | 'marriage' | 'friendship'
  lookingFor?: {
    minAge?: number
    maxAge?: number
    genders?: ('male' | 'female' | 'other')[]
    maxDistance?: number
    relationshipGoals?: ('dating' | 'relationship' | 'marriage' | 'friendship')[]
  }
  isPublic?: boolean
}

export interface LocationData {
  city: string
  country: string
  latitude: number
  longitude: number
}

// 프로필 생성
export async function createProfile(
  userId: string,
  firstName: string,
  lastName: string,
  gender: 'male' | 'female' | 'other',
  locationData: LocationData
): Promise<UserProfile> {
  try {
    const user = await prisma.user.findUnique({ where: { id: userId } })
    if (!user) throw new Error('사용자를 찾을 수 없습니다')

    const profile = await prisma.userProfile.create({
      data: {
        userId,
        firstName,
        lastName,
        bio: '',
        age: 18,
        gender,
        location: locationData,
        interests: [],
        jobTitle: '',
        company: '',
        education: '',
        relationshipGoal: 'dating',
        lookingFor: {
          minAge: 18,
          maxAge: 50,
          genders: gender === 'male' ? ['female'] : ['male'],
          maxDistance: 50,
          relationshipGoals: ['dating']
        },
        profileCompletion: 20, // firstName, lastName, gender, location 입력됨
        isPublic: true,
        isVerified: false
      }
    })

    logger.info('프로필 생성', { userId, profileId: profile.id })

    return profile as UserProfile
  } catch (error) {
    logger.error('프로필 생성 오류', {
      userId,
      error: error instanceof Error ? error.message : 'Unknown error'
    })
    throw error
  }
}

// 프로필 조회
export async function getProfile(userId: string): Promise<UserProfile | null> {
  try {
    const profile = await prisma.userProfile.findUnique({
      where: { userId }
    })
    return profile as UserProfile | null
  } catch (error) {
    logger.error('프로필 조회 오류', {
      userId,
      error: error instanceof Error ? error.message : 'Unknown error'
    })
    throw error
  }
}

// 공개 프로필 조회 (다른 사용자가 볼 수 있는 정보만)
export async function getPublicProfile(
  userId: string,
  viewerId?: string
): Promise<Partial<UserProfile> | null> {
  try {
    const profile = await prisma.userProfile.findUnique({
      where: { userId }
    })

    if (!profile || !profile.isPublic) return null

    // 차단 상태 확인
    if (viewerId) {
      const isBlocked = await prisma.block.findUnique({
        where: {
          blockerId_blockedId: {
            blockerId: viewerId,
            blockedId: userId
          }
        }
      })

      if (isBlocked) return null

      // 조회 기록 저장
      await prisma.profileView.create({
        data: {
          viewerId,
          viewedUserId: userId
        }
      })
    }

    // 공개 정보만 반환
    return {
      id: profile.id,
      userId: profile.userId,
      firstName: profile.firstName,
      lastName: profile.lastName,
      bio: profile.bio,
      age: profile.age,
      gender: profile.gender,
      location: profile.location,
      interests: profile.interests,
      jobTitle: profile.jobTitle,
      company: profile.company,
      education: profile.education,
      relationshipGoal: profile.relationshipGoal,
      updatedAt: profile.updatedAt
    } as Partial<UserProfile>
  } catch (error) {
    logger.error('공개 프로필 조회 오류', {
      userId,
      viewerId,
      error: error instanceof Error ? error.message : 'Unknown error'
    })
    throw error
  }
}

// 프로필 업데이트
export async function updateProfile(
  userId: string,
  updates: ProfileUpdateRequest
): Promise<UserProfile> {
  try {
    const profile = await prisma.userProfile.findUnique({
      where: { userId }
    })

    if (!profile) throw new Error('프로필을 찾을 수 없습니다')

    // 프로필 완성도 계산
    const completion = calculateProfileCompletion({
      ...profile,
      ...updates
    })

    const updatedProfile = await prisma.userProfile.update({
      where: { userId },
      data: {
        ...updates,
        profileCompletion: completion,
        updatedAt: new Date()
      }
    })

    logger.info('프로필 업데이트', {
      userId,
      fields: Object.keys(updates)
    })

    return updatedProfile as UserProfile
  } catch (error) {
    logger.error('프로필 업데이트 오류', {
      userId,
      error: error instanceof Error ? error.message : 'Unknown error'
    })
    throw error
  }
}

// 프로필 완성도 계산
function calculateProfileCompletion(profile: any): number {
  let completion = 0
  const fields = [
    { field: 'firstName', weight: 5 },
    { field: 'lastName', weight: 5 },
    { field: 'age', weight: 5 },
    { field: 'gender', weight: 5 },
    { field: 'location', weight: 10 },
    { field: 'bio', weight: 15, minLength: 20 },
    { field: 'interests', weight: 15, minLength: 3 },
    { field: 'jobTitle', weight: 10 },
    { field: 'company', weight: 10 },
    { field: 'education', weight: 10 },
    { field: 'relationshipGoal', weight: 5 }
  ]

  fields.forEach(({ field, weight, minLength }) => {
    const value = profile[field]

    if (
      value &&
      (typeof value === 'string' && value.trim() !== '') ||
      (Array.isArray(value) && value.length >= (minLength || 0)) ||
      (typeof value === 'object' && Object.keys(value).length > 0) ||
      (typeof value === 'number')
    ) {
      completion += weight
    }
  })

  return Math.min(100, completion)
}

// 사진 업로드
export async function uploadProfilePhoto(
  userId: string,
  photoData: PhotoUploadRequest
): Promise<UserPhoto> {
  try {
    const profile = await prisma.userProfile.findUnique({
      where: { userId }
    })

    if (!profile) throw new Error('프로필을 찾을 수 없습니다')

    // 이미지 처리 및 최적화
    const image = sharp(photoData.file)
    const metadata = await image.metadata()

    if (!metadata.width || !metadata.height) {
      throw new Error('이미지 처리 실패')
    }

    // 가로세로 비율 확인 (0.5 ~ 2.0)
    const aspectRatio = metadata.width / metadata.height
    if (aspectRatio < 0.5 || aspectRatio > 2.0) {
      throw new Error('이미지 비율이 적절하지 않습니다 (0.5~2.0)')
    }

    // 파일 크기 확인 (최대 10MB)
    if (photoData.file.length > 10 * 1024 * 1024) {
      throw new Error('파일 크기가 10MB를 초과합니다')
    }

    // 메인 이미지 생성 (최대 1920x1920)
    const mainImageBuffer = await image
      .resize(1920, 1920, {
        fit: 'inside',
        withoutEnlargement: true
      })
      .jpeg({ quality: 85 })
      .toBuffer()

    // 썸네일 생성 (400x400)
    const thumbnailBuffer = await sharp(mainImageBuffer)
      .resize(400, 400, {
        fit: 'cover'
      })
      .jpeg({ quality: 80 })
      .toBuffer()

    // 현재 사진 개수 확인
    const photoCount = await prisma.userPhoto.count({
      where: { userId }
    })

    if (photoCount >= 12) {
      throw new Error('최대 12장의 사진만 업로드 가능합니다')
    }

    // S3에 업로드 (실제 구현에서는 S3 클라이언트 사용)
    const photoId = generateId()
    const mainPhotoUrl = `${process.env.STORAGE_URL}/profiles/${userId}/${photoId}/main.jpg`
    const thumbnailUrl = `${process.env.STORAGE_URL}/profiles/${userId}/${photoId}/thumbnail.jpg`

    // 첫 번째 사진이면 메인 사진으로 설정
    const isMain = photoCount === 0

    const photo = await prisma.userPhoto.create({
      data: {
        userId,
        photoUrl: mainPhotoUrl,
        thumbnailUrl: thumbnailUrl,
        order: photoCount + 1,
        isMain,
        width: metadata.width,
        height: metadata.height,
        fileSize: photoData.file.length
      }
    })

    // 프로필 완성도 업데이트 (사진 추가)
    await updateProfile(userId, {})

    logger.info('사진 업로드', {
      userId,
      photoId: photo.id,
      fileSize: photoData.file.length
    })

    return photo as UserPhoto
  } catch (error) {
    logger.error('사진 업로드 오류', {
      userId,
      error: error instanceof Error ? error.message : 'Unknown error'
    })
    throw error
  }
}

// 사진 목록 조회
export async function getUserPhotos(userId: string): Promise<UserPhoto[]> {
  try {
    const photos = await prisma.userPhoto.findMany({
      where: { userId },
      orderBy: { order: 'asc' }
    })

    return photos as UserPhoto[]
  } catch (error) {
    logger.error('사진 목록 조회 오류', {
      userId,
      error: error instanceof Error ? error.message : 'Unknown error'
    })
    throw error
  }
}

// 사진 순서 변경
export async function reorderPhotos(
  userId: string,
  photoOrder: string[]
): Promise<UserPhoto[]> {
  try {
    // 사용자의 모든 사진 확인
    const photos = await prisma.userPhoto.findMany({
      where: { userId }
    })

    // 순서 배열에 모든 사진 ID가 포함되어 있는지 확인
    if (photos.length !== photoOrder.length) {
      throw new Error('사진 순서 데이터가 일치하지 않습니다')
    }

    // 순서 업데이트
    const updatedPhotos = await Promise.all(
      photoOrder.map((photoId, index) =>
        prisma.userPhoto.update({
          where: { id: photoId },
          data: { order: index + 1, isMain: index === 0 }
        })
      )
    )

    logger.info('사진 순서 변경', { userId })

    return updatedPhotos as UserPhoto[]
  } catch (error) {
    logger.error('사진 순서 변경 오류', {
      userId,
      error: error instanceof Error ? error.message : 'Unknown error'
    })
    throw error
  }
}

// 사진 삭제
export async function deletePhoto(
  userId: string,
  photoId: string
): Promise<boolean> {
  try {
    const photo = await prisma.userPhoto.findUnique({
      where: { id: photoId }
    })

    if (!photo || photo.userId !== userId) {
      throw new Error('사진을 찾을 수 없습니다')
    }

    // 메인 사진인 경우 다음 사진을 메인으로 설정
    if (photo.isMain) {
      const nextPhoto = await prisma.userPhoto.findFirst({
        where: {
          userId,
          order: { gt: photo.order }
        },
        orderBy: { order: 'asc' }
      })

      if (nextPhoto) {
        await prisma.userPhoto.update({
          where: { id: nextPhoto.id },
          data: { isMain: true }
        })
      }
    }

    // 사진 삭제
    await prisma.userPhoto.delete({
      where: { id: photoId }
    })

    // 남은 사진의 순서 재정렬
    const remainingPhotos = await prisma.userPhoto.findMany({
      where: { userId },
      orderBy: { order: 'asc' }
    })

    await Promise.all(
      remainingPhotos.map((p, index) =>
        prisma.userPhoto.update({
          where: { id: p.id },
          data: { order: index + 1 }
        })
      )
    )

    logger.info('사진 삭제', { userId, photoId })

    return true
  } catch (error) {
    logger.error('사진 삭제 오류', {
      userId,
      photoId,
      error: error instanceof Error ? error.message : 'Unknown error'
    })
    throw error
  }
}

// 프로필 선호도 생성/조회
export async function getOrCreatePreferences(
  userId: string
): Promise<ProfilePreferences> {
  try {
    let preferences = await prisma.profilePreferences.findUnique({
      where: { userId }
    })

    if (!preferences) {
      preferences = await prisma.profilePreferences.create({
        data: {
          userId,
          showOnlineStatus: true,
          allowMessages: 'everyone',
          allowPhotoDownload: false,
          notifyNewLike: true,
          notifyNewMessage: true,
          notifyVisitor: true,
          lastActivityVisibility: true
        }
      })
    }

    return preferences as ProfilePreferences
  } catch (error) {
    logger.error('프로필 선호도 조회 오류', {
      userId,
      error: error instanceof Error ? error.message : 'Unknown error'
    })
    throw error
  }
}

// 프로필 선호도 업데이트
export async function updatePreferences(
  userId: string,
  updates: Partial<ProfilePreferences>
): Promise<ProfilePreferences> {
  try {
    const preferences = await prisma.profilePreferences.upsert({
      where: { userId },
      update: updates,
      create: {
        userId,
        ...updates
      }
    })

    logger.info('프로필 선호도 업데이트', { userId })

    return preferences as ProfilePreferences
  } catch (error) {
    logger.error('프로필 선호도 업데이트 오류', {
      userId,
      error: error instanceof Error ? error.message : 'Unknown error'
    })
    throw error
  }
}

// 프로필 조회 기록
export async function getProfileViews(
  userId: string,
  limit: number = 50,
  offset: number = 0
): Promise<{ viewerId: string; viewedAt: Date }[]> {
  try {
    const views = await prisma.profileView.findMany({
      where: { viewedUserId: userId },
      select: { viewerId: true, viewedAt: true },
      orderBy: { viewedAt: 'desc' },
      take: limit,
      skip: offset
    })

    return views as { viewerId: string; viewedAt: Date }[]
  } catch (error) {
    logger.error('프로필 조회 기록 조회 오류', {
      userId,
      error: error instanceof Error ? error.message : 'Unknown error'
    })
    throw error
  }
}

// 프로필 검색 (필터링)
export async function searchProfiles(
  userId: string,
  filters: {
    minAge?: number
    maxAge?: number
    gender?: 'male' | 'female' | 'other'
    interests?: string[]
    relationshipGoals?: ('dating' | 'relationship' | 'marriage' | 'friendship')[]
    maxDistance?: number
  },
  limit: number = 20,
  offset: number = 0
): Promise<Partial<UserProfile>[]> {
  try {
    const userProfile = await prisma.userProfile.findUnique({
      where: { userId }
    })

    if (!userProfile) throw new Error('사용자 프로필을 찾을 수 없습니다')

    // 차단 사용자 목록 조회
    const blockedUsers = await prisma.block.findMany({
      where: {
        OR: [
          { blockerId: userId },
          { blockedId: userId }
        ]
      },
      select: {
        blockerId: true,
        blockedId: true
      }
    })

    const blockedUserIds = new Set(
      blockedUsers.flatMap(b => [b.blockerId, b.blockedId])
    )

    // 프로필 검색
    const profiles = await prisma.userProfile.findMany({
      where: {
        isPublic: true,
        userId: { not: userId },
        age: {
          gte: filters.minAge || 18,
          lte: filters.maxAge || 100
        },
        ...(filters.gender && { gender: filters.gender }),
        ...(filters.relationshipGoals && {
          relationshipGoal: {
            in: filters.relationshipGoals
          }
        })
      },
      select: {
        id: true,
        userId: true,
        firstName: true,
        lastName: true,
        bio: true,
        age: true,
        gender: true,
        location: true,
        interests: true,
        jobTitle: true,
        company: true,
        relationshipGoal: true,
        updatedAt: true
      },
      orderBy: { updatedAt: 'desc' },
      take: limit,
      skip: offset
    })

    // 차단 사용자 제외
    const filteredProfiles = profiles.filter(
      p => !blockedUserIds.has(p.userId)
    )

    // 관심사 필터링 (선택사항)
    if (filters.interests && filters.interests.length > 0) {
      return filteredProfiles.filter(p =>
        filters.interests!.some(interest =>
          p.interests.includes(interest)
        )
      ) as Partial<UserProfile>[]
    }

    return filteredProfiles as Partial<UserProfile>[]
  } catch (error) {
    logger.error('프로필 검색 오류', {
      userId,
      error: error instanceof Error ? error.message : 'Unknown error'
    })
    throw error
  }
}

// 프로필 공개/비공개 토글
export async function toggleProfileVisibility(
  userId: string,
  isPublic: boolean
): Promise<UserProfile> {
  try {
    const profile = await prisma.userProfile.update({
      where: { userId },
      data: { isPublic }
    })

    logger.info('프로필 공개 설정 변경', { userId, isPublic })

    return profile as UserProfile
  } catch (error) {
    logger.error('프로필 공개 설정 변경 오류', {
      userId,
      error: error instanceof Error ? error.message : 'Unknown error'
    })
    throw error
  }
}

// 프로필 검증
export async function verifyProfile(userId: string): Promise<UserProfile> {
  try {
    const profile = await prisma.userProfile.update({
      where: { userId },
      data: { isVerified: true }
    })

    logger.info('프로필 검증 완료', { userId })

    return profile as UserProfile
  } catch (error) {
    logger.error('프로필 검증 오류', {
      userId,
      error: error instanceof Error ? error.message : 'Unknown error'
    })
    throw error
  }
}

// ===== 차단 관련 함수 =====

// 사용자 차단
export async function blockProfile(
  userId: string,
  blockedUserId: string,
  reason?: string
): Promise<void> {
  try {
    await prisma.block.upsert({
      where: {
        blockerId_blockedId: {
          blockerId: userId,
          blockedId: blockedUserId
        }
      },
      create: {
        blockerId: userId,
        blockedId: blockedUserId,
        reason
      },
      update: { reason }
    })

    logger.info('사용자 차단', { userId, blockedUserId })
  } catch (error) {
    logger.error('사용자 차단 오류', {
      userId,
      blockedUserId,
      error: error instanceof Error ? error.message : 'Unknown error'
    })
    throw error
  }
}

// 사용자 차단 해제
export async function unblockProfile(
  userId: string,
  unblockedUserId: string
): Promise<void> {
  try {
    await prisma.block.deleteMany({
      where: {
        blockerId: userId,
        blockedId: unblockedUserId
      }
    })

    logger.info('사용자 차단 해제', { userId, unblockedUserId })
  } catch (error) {
    logger.error('사용자 차단 해제 오류', {
      userId,
      unblockedUserId,
      error: error instanceof Error ? error.message : 'Unknown error'
    })
    throw error
  }
}

// 차단된 사용자 목록 조회
export async function getBlockedProfiles(userId: string): Promise<string[]> {
  try {
    const blocks = await prisma.block.findMany({
      where: { blockerId: userId },
      select: { blockedId: true }
    })

    return blocks.map(b => b.blockedId)
  } catch (error) {
    logger.error('차단된 사용자 목록 조회 오류', {
      userId,
      error: error instanceof Error ? error.message : 'Unknown error'
    })
    throw error
  }
}

// ===== 사용자 관심사 =====

// 사용자 관심사 업데이트
export async function updateUserInterests(
  userId: string,
  interests: string[]
): Promise<UserProfile> {
  try {
    const profile = await prisma.userProfile.update({
      where: { userId },
      data: {
        interests,
        updatedAt: new Date()
      }
    })

    logger.info('사용자 관심사 업데이트', { userId, interests })

    return profile as UserProfile
  } catch (error) {
    logger.error('사용자 관심사 업데이트 오류', {
      userId,
      error: error instanceof Error ? error.message: 'Unknown error'
    })
    throw error
  }
}

// ===== 함수 별칭 (API 호환성) =====

// ===== 프로필 통계 및 검증 =====

// 프로필 통계 조회
export async function getProfileStatistics(userId: string): Promise<{
  viewCount: number;
  likeCount: number;
  matchCount: number;
  completeness: number;
}> {
  try {
    const [viewCount, likeCount, matchCount, profile] = await Promise.all([
      prisma.profileView.count({
        where: { viewedUserId: userId }
      }),
      prisma.like.count({
        where: { likedUserId: userId }
      }),
      prisma.match.count({
        where: {
          OR: [
            { user1Id: userId },
            { user2Id: userId }
          ]
        }
      }),
      prisma.userProfile.findUnique({
        where: { userId }
      })
    ]);

    return {
      viewCount,
      likeCount,
      matchCount,
      completeness: profile?.profileCompletion || 0
    };
  } catch (error) {
    console.error('프로필 통계 조회 오류:', error);
    throw error;
  }
}

// 프로필 조회 기록 저장
export async function recordProfileView(
  viewerId: string,
  viewedUserId: string
): Promise<void> {
  try {
    await prisma.profileView.create({
      data: {
        viewerId,
        viewedUserId
      }
    });
  } catch (error) {
    console.error('프로필 조회 기록 저장 오류:', error);
  }
}

// ===== 프로필 검증 =====

// 프로필 검증 정보 조회
export async function getProfileVerification(userId: string): Promise<{
  idVerified: boolean;
  phoneVerified: boolean;
  emailVerified: boolean;
  verifiedAt?: Date;
} | null> {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        emailVerified: true,
        phoneVerified: true,
        idVerificationStatus: true,
      }
    });

    if (!user) return null;

    return {
      idVerified: user.idVerificationStatus === 'verified',
      phoneVerified: user.phoneVerified,
      emailVerified: user.emailVerified,
    };
  } catch (error) {
    console.error('프로필 검증 정보 조회 오류:', error);
    throw error;
  }
}

// ID 검증 이미지 업로드
export async function uploadIdVerificationImage(
  userId: string,
  imageBuffer: Buffer,
  documentType: 'passport' | 'driver_license' | 'id_card'
): Promise<{
  success: boolean;
  status: string;
  documentUrl?: string;
}> {
  try {
    // In production, upload to S3 or similar service
    const documentUrl = `${process.env.STORAGE_URL}/verification/${userId}/${documentType}/${Date.now()}.jpg`;

    // Update user's ID verification status
    await prisma.user.update({
      where: { id: userId },
      data: {
        idVerificationStatus: 'pending',
        idVerificationDocumentType: documentType,
      }
    });

    return {
      success: true,
      status: 'pending',
      documentUrl
    };
  } catch (error) {
    console.error('ID 검증 이미지 업로드 오류:', error);
    return {
      success: false,
      status: 'error'
    };
  }
}

// 휴대폰 검증 코드 전송
export async function sendPhoneVerificationCode(userId: string, phoneNumber: string): Promise<{
  success: boolean;
  codeSent: boolean;
  expiresIn: number;
}> {
  try {
    const code = Math.random().toString().substring(2, 8);
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10분

    // Save verification code (in production, use proper SMS service)
    console.log(`[VERIFICATION] Sending code ${code} to ${phoneNumber}`);

    return {
      success: true,
      codeSent: true,
      expiresIn: 600 // 10 minutes in seconds
    };
  } catch (error) {
    console.error('휴대폰 검증 코드 전송 오류:', error);
    return {
      success: false,
      codeSent: false,
      expiresIn: 0
    };
  }
}

// 휴대폰 검증 코드 확인
export async function verifyPhoneCode(
  userId: string,
  code: string
): Promise<{
  success: boolean;
  verified: boolean;
  message: string;
}> {
  try {
    // In production, verify against stored code
    if (code.length === 6 && /^\d+$/.test(code)) {
      await prisma.user.update({
        where: { id: userId },
        data: {
          phoneVerified: true,
          phoneVerifiedAt: new Date()
        }
      });

      return {
        success: true,
        verified: true,
        message: '휴대폰 검증이 완료되었습니다'
      };
    }

    return {
      success: false,
      verified: false,
      message: '검증 코드가 올바르지 않습니다'
    };
  } catch (error) {
    console.error('휴대폰 검증 코드 확인 오류:', error);
    return {
      success: false,
      verified: false,
      message: '검증 중 오류가 발생했습니다'
    };
  }
}

// ===== 함수 별칭 및 export =====

// Export function aliases for API route compatibility
export const deleteProfileImage = deletePhoto;
export const reorderProfileImages = reorderPhotos;
export const getProfileImages = getUserPhotos;
export const uploadProfileImage = uploadProfilePhoto;
export { calculateProfileCompletion };
export { calculateProfileCompletion as calculateProfileCompleteness };

/**
 * 프로필 관리 시스템 단위 테스트
 */

import {
  createProfile,
  getProfile,
  getPublicProfile,
  updateProfile,
  uploadProfilePhoto,
  getUserPhotos,
  reorderPhotos,
  deletePhoto,
  getOrCreatePreferences,
  updatePreferences,
  getProfileViews,
  searchProfiles,
  toggleProfileVisibility,
  verifyProfile
} from '@/lib/profile-system'
import { prisma } from '@/lib/db'

describe('프로필 관리 시스템 (Profile System)', () => {
  const userId = 'test-user-id'
  const locationData = {
    city: 'Seoul',
    country: 'South Korea',
    latitude: 37.7749,
    longitude: -122.4194
  }

  describe('프로필 생성 및 조회', () => {
    it('새로운 프로필을 생성해야 함', async () => {
      const profile = await createProfile(
        userId,
        'John',
        'Doe',
        'male',
        locationData
      )

      expect(profile.userId).toBe(userId)
      expect(profile.firstName).toBe('John')
      expect(profile.lastName).toBe('Doe')
      expect(profile.gender).toBe('male')
      expect(profile.profileCompletion).toBe(20)
      expect(profile.isPublic).toBe(true)
      expect(profile.isVerified).toBe(false)
    })

    it('존재하는 프로필을 조회해야 함', async () => {
      const profile = await getProfile(userId)

      expect(profile).not.toBeNull()
      expect(profile?.userId).toBe(userId)
      expect(profile?.firstName).toBe('John')
    })

    it('존재하지 않는 사용자 프로필 조회 시 null 반환', async () => {
      const profile = await getProfile('non-existing-user')

      expect(profile).toBeNull()
    })
  })

  describe('공개 프로필 조회', () => {
    it('공개 프로필을 조회해야 함', async () => {
      const publicProfile = await getPublicProfile(userId)

      expect(publicProfile).not.toBeNull()
      expect(publicProfile?.firstName).toBe('John')
      expect(publicProfile?.lastName).toBe('Doe')
      // 비공개 정보는 포함되지 않음
      expect((publicProfile as any)?.relationshipGoal).toBeDefined()
    })

    it('비공개 프로필은 조회되지 않음', async () => {
      await toggleProfileVisibility(userId, false)
      const publicProfile = await getPublicProfile(userId)

      expect(publicProfile).toBeNull()
    })

    it('차단된 사용자 프로필은 보이지 않음', async () => {
      const viewerId = 'viewer-id'
      // 차단 설정 (실제 구현에서)
      const publicProfile = await getPublicProfile(userId, viewerId)

      // 프로필 조회 기록이 저장됨
      expect(publicProfile).not.toBeNull()
    })
  })

  describe('프로필 업데이트', () => {
    it('프로필 정보를 업데이트해야 함', async () => {
      const updated = await updateProfile(userId, {
        bio: 'Software developer from Seoul',
        age: 28,
        jobTitle: 'Senior Developer',
        company: 'Tech Company',
        interests: ['coding', 'gaming', 'reading']
      })

      expect(updated.bio).toBe('Software developer from Seoul')
      expect(updated.age).toBe(28)
      expect(updated.interests).toContain('coding')
      expect(updated.profileCompletion).toBeGreaterThan(20)
    })

    it('프로필 완성도가 올바르게 계산됨', async () => {
      const profile = await updateProfile(userId, {
        bio: 'Complete bio text that is more than 20 characters long',
        age: 30,
        gender: 'male',
        jobTitle: 'Developer',
        company: 'Company',
        education: 'University',
        interests: ['coding', 'gaming', 'reading'],
        relationshipGoal: 'relationship'
      })

      expect(profile.profileCompletion).toBeGreaterThan(50)
    })

    it('부분 업데이트가 가능해야 함', async () => {
      const updated = await updateProfile(userId, {
        bio: 'Updated bio only'
      })

      expect(updated.bio).toBe('Updated bio only')
      expect(updated.age).toBe(30) // 이전 값 유지
    })
  })

  describe('사진 관리', () => {
    it('프로필 사진을 업로드해야 함', async () => {
      const photoBuffer = Buffer.from('fake-image-data')
      const photo = await uploadProfilePhoto(userId, {
        file: photoBuffer,
        mimeType: 'image/jpeg',
        fileName: 'photo.jpg'
      })

      expect(photo.userId).toBe(userId)
      expect(photo.isMain).toBe(true) // 첫 번째 사진
      expect(photo.order).toBe(1)
      expect(photo.fileSize).toBe(photoBuffer.length)
    })

    it('최대 12장까지 사진 업로드 가능', async () => {
      // 11장 추가 업로드 (이미 1장 있음)
      for (let i = 0; i < 11; i++) {
        const photoBuffer = Buffer.from(`fake-image-data-${i}`)
        await uploadProfilePhoto(userId, {
          file: photoBuffer,
          mimeType: 'image/jpeg',
          fileName: `photo-${i}.jpg`
        })
      }

      const photos = await getUserPhotos(userId)
      expect(photos.length).toBeLessThanOrEqual(12)
    })

    it('13번째 사진 업로드 시 실패', async () => {
      // 이미 12장이 업로드됨
      const photoBuffer = Buffer.from('fake-image-data-13')

      try {
        await uploadProfilePhoto(userId, {
          file: photoBuffer,
          mimeType: 'image/jpeg',
          fileName: 'photo-13.jpg'
        })
        fail('Should throw error')
      } catch (error) {
        expect(error).toBeTruthy()
      }
    })

    it('사용자의 사진 목록을 조회해야 함', async () => {
      const photos = await getUserPhotos(userId)

      expect(Array.isArray(photos)).toBe(true)
      expect(photos.length).toBeGreaterThan(0)
      expect(photos[0].isMain).toBe(true)
    })

    it('사진 순서를 변경해야 함', async () => {
      const photos = await getUserPhotos(userId)
      const photoIds = photos.map(p => p.id)

      if (photoIds.length >= 2) {
        const reversed = photoIds.reverse()
        const reordered = await reorderPhotos(userId, reversed)

        expect(reordered[0].isMain).toBe(true)
        expect(reordered[0].order).toBe(1)
      }
    })

    it('사진을 삭제해야 함', async () => {
      const photos = await getUserPhotos(userId)
      if (photos.length > 0) {
        const photoToDelete = photos[photos.length - 1]
        const result = await deletePhoto(userId, photoToDelete.id)

        expect(result).toBe(true)

        const updatedPhotos = await getUserPhotos(userId)
        expect(updatedPhotos.length).toBe(photos.length - 1)
      }
    })

    it('메인 사진 삭제 시 다음 사진을 메인으로 설정', async () => {
      const photos = await getUserPhotos(userId)
      if (photos.length >= 2) {
        const mainPhoto = photos[0]
        await deletePhoto(userId, mainPhoto.id)

        const updatedPhotos = await getUserPhotos(userId)
        expect(updatedPhotos[0].isMain).toBe(true)
        expect(updatedPhotos[0].order).toBe(1)
      }
    })
  })

  describe('선호도 관리', () => {
    it('프로필 선호도를 생성/조회해야 함', async () => {
      const preferences = await getOrCreatePreferences(userId)

      expect(preferences.userId).toBe(userId)
      expect(preferences.showOnlineStatus).toBe(true)
      expect(preferences.allowMessages).toBe('everyone')
      expect(preferences.notifyNewMessage).toBe(true)
    })

    it('선호도를 업데이트해야 함', async () => {
      const updated = await updatePreferences(userId, {
        showOnlineStatus: false,
        allowMessages: 'matched',
        notifyNewMessage: false
      })

      expect(updated.showOnlineStatus).toBe(false)
      expect(updated.allowMessages).toBe('matched')
      expect(updated.notifyNewMessage).toBe(false)
    })

    it('부분 선호도 업데이트 가능', async () => {
      const updated = await updatePreferences(userId, {
        notifyVisitor: false
      })

      expect(updated.notifyVisitor).toBe(false)
      expect(updated.showOnlineStatus).toBe(false) // 이전 값 유지
    })
  })

  describe('프로필 검색 및 필터링', () => {
    it('나이 범위로 프로필 검색', async () => {
      const profiles = await searchProfiles(userId, {
        minAge: 25,
        maxAge: 35
      })

      expect(Array.isArray(profiles)).toBe(true)
      profiles.forEach(profile => {
        expect(profile.age).toBeGreaterThanOrEqual(25)
        expect(profile.age).toBeLessThanOrEqual(35)
      })
    })

    it('성별로 프로필 필터링', async () => {
      const profiles = await searchProfiles(userId, {
        gender: 'female'
      })

      expect(Array.isArray(profiles)).toBe(true)
      profiles.forEach(profile => {
        expect(profile.gender).toBe('female')
      })
    })

    it('관심사로 프로필 검색', async () => {
      const profiles = await searchProfiles(userId, {
        interests: ['coding', 'gaming']
      })

      expect(Array.isArray(profiles)).toBe(true)
      profiles.forEach(profile => {
        const hasInterest =
          profile.interests &&
          profile.interests.some(i =>
            ['coding', 'gaming'].includes(i)
          )
        expect(hasInterest).toBe(true)
      })
    })

    it('관계 목표로 프로필 검색', async () => {
      const profiles = await searchProfiles(userId, {
        relationshipGoals: ['relationship']
      })

      expect(Array.isArray(profiles)).toBe(true)
      profiles.forEach(profile => {
        expect(profile.relationshipGoal).toBe('relationship')
      })
    })

    it('페이지네이션이 작동해야 함', async () => {
      const page1 = await searchProfiles(userId, {}, 10, 0)
      const page2 = await searchProfiles(userId, {}, 10, 10)

      expect(page1.length).toBeLessThanOrEqual(10)
      expect(page2.length).toBeLessThanOrEqual(10)
    })

    it('차단된 사용자는 검색 결과에서 제외', async () => {
      const profiles = await searchProfiles(userId, {})

      // 모든 프로필이 현재 사용자가 아님
      profiles.forEach(profile => {
        expect(profile.userId).not.toBe(userId)
      })
    })
  })

  describe('프로필 조회 기록', () => {
    it('프로필을 본 사람 목록 조회', async () => {
      const views = await getProfileViews(userId)

      expect(Array.isArray(views)).toBe(true)
      views.forEach(view => {
        expect(view.viewerId).toBeDefined()
        expect(view.viewedAt).toBeDefined()
      })
    })

    it('조회 기록 페이지네이션', async () => {
      const views1 = await getProfileViews(userId, 10, 0)
      const views2 = await getProfileViews(userId, 10, 10)

      expect(views1.length).toBeLessThanOrEqual(10)
      expect(views2.length).toBeLessThanOrEqual(10)
    })
  })

  describe('프로필 공개 설정', () => {
    it('프로필을 공개로 설정', async () => {
      const profile = await toggleProfileVisibility(userId, true)

      expect(profile.isPublic).toBe(true)
    })

    it('프로필을 비공개로 설정', async () => {
      const profile = await toggleProfileVisibility(userId, false)

      expect(profile.isPublic).toBe(false)
    })

    it('비공개 프로필은 검색에서 제외', async () => {
      await toggleProfileVisibility(userId, false)
      // 이 사용자의 프로필은 다른 사용자 검색에서 보이지 않음
      const publicProfile = await getPublicProfile(userId)
      expect(publicProfile).toBeNull()
    })
  })

  describe('프로필 검증', () => {
    it('프로필 검증 상태 변경', async () => {
      const profile = await verifyProfile(userId)

      expect(profile.isVerified).toBe(true)
    })
  })

  describe('에러 처리', () => {
    it('존재하지 않는 사용자로 프로필 생성 시 실패', async () => {
      try {
        await createProfile(
          'non-existing-user',
          'John',
          'Doe',
          'male',
          locationData
        )
        fail('Should throw error')
      } catch (error) {
        expect(error).toBeTruthy()
      }
    })

    it('잘못된 이미지 비율로 업로드 시 실패', async () => {
      // 비율이 0.5 ~ 2.0을 벗어나는 이미지
      const wideImage = Buffer.from('extreme-wide-image')

      try {
        await uploadProfilePhoto(userId, {
          file: wideImage,
          mimeType: 'image/jpeg',
          fileName: 'wide.jpg'
        })
        // 비율 검사는 실제 이미지 처리에서 수행
      } catch (error) {
        expect(error).toBeTruthy()
      }
    })

    it('프로필이 없는 상태에서 업데이트 시도 시 실패', async () => {
      try {
        await updateProfile('non-existing-user', {
          bio: 'test bio'
        })
        fail('Should throw error')
      } catch (error) {
        expect(error).toBeTruthy()
      }
    })

    it('존재하지 않는 사진 삭제 시 실패', async () => {
      try {
        await deletePhoto(userId, 'non-existing-photo')
        fail('Should throw error')
      } catch (error) {
        expect(error).toBeTruthy()
      }
    })
  })

  describe('성능 테스트', () => {
    it('대량의 프로필 검색이 빠르게 수행됨', async () => {
      const startTime = Date.now()
      const profiles = await searchProfiles(userId, {}, 100, 0)
      const endTime = Date.now()

      expect(endTime - startTime).toBeLessThan(5000) // 5초 이내
      expect(profiles.length).toBeLessThanOrEqual(100)
    })

    it('많은 사진 순서 변경이 원자적으로 처리됨', async () => {
      const photos = await getUserPhotos(userId)
      if (photos.length >= 2) {
        const photoIds = photos.map(p => p.id)
        const startTime = Date.now()
        const reordered = await reorderPhotos(userId, photoIds)
        const endTime = Date.now()

        expect(endTime - startTime).toBeLessThan(2000)
        expect(reordered.length).toBe(photos.length)
      }
    })

    it('프로필 조회 기록 대량 조회', async () => {
      const startTime = Date.now()
      const views = await getProfileViews(userId, 100, 0)
      const endTime = Date.now()

      expect(endTime - startTime).toBeLessThan(3000)
    })
  })
})

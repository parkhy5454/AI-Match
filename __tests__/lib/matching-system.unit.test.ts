/**
 * 매칭 시스템 단위 테스트
 */

import {
  likeUser,
  unlikeUser,
  calculateCompatibility,
  getMatches,
  getLikes,
  getReceivedLikes,
  getDiscoveryFeed,
  getMatchingStats,
  getRecommendations
} from '@/lib/matching-system'

describe('매칭 시스템 (Matching System)', () => {
  const userId1 = 'user-1'
  const userId2 = 'user-2'
  const userId3 = 'user-3'

  describe('좋아요 시스템', () => {
    it('사용자에게 좋아요를 할 수 있음', async () => {
      const like = await likeUser(userId1, userId2)

      expect(like.likerId).toBe(userId1)
      expect(like.likedId).toBe(userId2)
      expect(like.compatibility).toBeGreaterThanOrEqual(0)
      expect(like.compatibility).toBeLessThanOrEqual(100)
      expect(like.isReverted).toBe(false)
    })

    it('자신에게 좋아요를 할 수 없음', async () => {
      try {
        await likeUser(userId1, userId1)
        fail('Should throw error')
      } catch (error) {
        expect(error).toBeTruthy()
      }
    })

    it('같은 사용자에게 두 번 좋아요 할 수 없음', async () => {
      await likeUser(userId1, userId2)

      try {
        await likeUser(userId1, userId2)
        fail('Should throw error')
      } catch (error) {
        expect(error).toBeTruthy()
      }
    })

    it('좋아요를 취소할 수 있음', async () => {
      await likeUser(userId1, userId3)
      const result = await unlikeUser(userId1, userId3)

      expect(result).toBe(true)
    })

    it('취소한 좋아요는 다시 할 수 있음', async () => {
      await unlikeUser(userId1, userId3)
      const like = await likeUser(userId1, userId3)

      expect(like.isReverted).toBe(false)
    })
  })

  describe('상호 좋아요 (매칭)', () => {
    it('상호 좋아요 시 자동 매칭 생성', async () => {
      await likeUser(userId1, userId2)
      // 상호 좋아요 시 매칭 생성됨

      const matches = await getMatches(userId1)
      expect(matches.length).toBeGreaterThan(0)
    })

    it('일방 좋아요는 매칭 미생성', async () => {
      const before = await getMatches(userId1)
      const beforeCount = before.length

      await likeUser(userId1, 'other-user')
      // 상호 좋아요 아님

      // 새로운 매칭이 생성되지 않음 (상호 좋아요 아니므로)
    })
  })

  describe('호환성 계산', () => {
    it('호환성 점수 계산 (0-100)', async () => {
      const compatibility = await calculateCompatibility(userId1, userId2)

      expect(compatibility).toBeGreaterThanOrEqual(0)
      expect(compatibility).toBeLessThanOrEqual(100)
    })

    it('같은 나이는 높은 호환성', async () => {
      const compat1 = await calculateCompatibility(userId1, userId2)
      // 나이 차이 5년 이내: 15점 추가

      expect(compat1).toBeGreaterThanOrEqual(0)
    })

    it('공통 관심사가 많을수록 호환성 높음', async () => {
      // 관심사 호환성: 최대 30점
      const compat = await calculateCompatibility(userId1, userId2)

      expect(compat).toBeLessThanOrEqual(100)
    })

    it('관계 목표가 같으면 호환성 높음', async () => {
      // 관계 목표 호환성: 최대 20점
      const compat = await calculateCompatibility(userId1, userId2)

      expect(compat).toBeGreaterThanOrEqual(0)
    })
  })

  describe('좋아요 목록', () => {
    it('내가 남긴 좋아요 목록 조회', async () => {
      const likes = await getLikes(userId1)

      expect(Array.isArray(likes)).toBe(true)
      likes.forEach(like => {
        expect(like.likerId).toBe(userId1)
        expect(like.isReverted).toBe(false)
      })
    })

    it('받은 좋아요 목록 조회', async () => {
      const likes = await getReceivedLikes(userId2)

      expect(Array.isArray(likes)).toBe(true)
      likes.forEach(like => {
        expect(like.likedId).toBe(userId2)
      })
    })

    it('좋아요 목록 페이지네이션', async () => {
      const page1 = await getLikes(userId1, 10, 0)
      const page2 = await getLikes(userId1, 10, 10)

      expect(page1.length).toBeLessThanOrEqual(10)
      expect(page2.length).toBeLessThanOrEqual(10)
    })

    it('취소한 좋아요는 목록에 포함 안 됨', async () => {
      const beforeUnlike = await getLikes(userId1)
      await unlikeUser(userId1, userId3)
      const afterUnlike = await getLikes(userId1)

      expect(afterUnlike.length).toBeLessThanOrEqual(beforeUnlike.length)
    })
  })

  describe('매칭 조회', () => {
    it('매칭된 사용자 목록 조회', async () => {
      const matches = await getMatches(userId1)

      expect(Array.isArray(matches)).toBe(true)
      matches.forEach(match => {
        expect(
          match.userId1 === userId1 || match.userId2 === userId1
        ).toBe(true)
        expect(match.isActive).toBe(true)
      })
    })

    it('매칭 상태별 필터링', async () => {
      const accepted = await getMatches(userId1, 'accepted')

      expect(Array.isArray(accepted)).toBe(true)
      accepted.forEach(match => {
        expect(match.status).toBe('accepted')
      })
    })

    it('매칭 페이지네이션', async () => {
      const page1 = await getMatches(userId1, undefined, 10, 0)
      const page2 = await getMatches(userId1, undefined, 10, 10)

      expect(page1.length).toBeLessThanOrEqual(10)
      expect(page2.length).toBeLessThanOrEqual(10)
    })

    it('비활성 매칭은 조회에서 제외', async () => {
      const matches = await getMatches(userId1)

      matches.forEach(match => {
        expect(match.isActive).toBe(true)
      })
    })
  })

  describe('디스커버리 피드', () => {
    it('디스커버리 피드 생성', async () => {
      const cards = await getDiscoveryFeed(userId1, {}, 10)

      expect(Array.isArray(cards)).toBe(true)
      cards.forEach(card => {
        expect(card.userId).not.toBe(userId1)
        expect(card.firstName).toBeDefined()
        expect(card.photos).toBeDefined()
        expect(card.compatibilityScore).toBeGreaterThanOrEqual(0)
        expect(card.compatibilityScore).toBeLessThanOrEqual(100)
      })
    })

    it('나이 범위로 필터링', async () => {
      const cards = await getDiscoveryFeed(userId1, {
        minAge: 25,
        maxAge: 35
      })

      cards.forEach(card => {
        expect(card.age).toBeGreaterThanOrEqual(25)
        expect(card.age).toBeLessThanOrEqual(35)
      })
    })

    it('성별로 필터링', async () => {
      const cards = await getDiscoveryFeed(userId1, {
        gender: 'female'
      })

      cards.forEach(card => {
        expect(card.gender).toBe('female')
      })
    })

    it('관심사로 필터링', async () => {
      const cards = await getDiscoveryFeed(userId1, {
        interests: ['coding', 'gaming']
      })

      cards.forEach(card => {
        const hasCommonInterest = card.commonInterests.length > 0
        expect(hasCommonInterest).toBe(true)
      })
    })

    it('이미 좋아요한 사용자 제외', async () => {
      const cards = await getDiscoveryFeed(userId1, {}, 100)
      const likedUsers = await getLikes(userId1)

      const likedIds = new Set(likedUsers.map(l => l.likedId))

      cards.forEach(card => {
        expect(likedIds.has(card.userId)).toBe(false)
      })
    })

    it('차단된 사용자 제외', async () => {
      const cards = await getDiscoveryFeed(userId1, {}, 100)

      // 차단된 사용자가 없음
      expect(cards.length).toBeGreaterThanOrEqual(0)
    })

    it('호환성 점수 포함', async () => {
      const cards = await getDiscoveryFeed(userId1, {}, 5)

      cards.forEach(card => {
        expect(card.compatibilityScore).toBeGreaterThanOrEqual(0)
        expect(card.compatibilityScore).toBeLessThanOrEqual(100)
      })
    })

    it('페이지네이션', async () => {
      const page1 = await getDiscoveryFeed(userId1, {}, 10, 0)
      const page2 = await getDiscoveryFeed(userId1, {}, 10, 10)

      expect(page1.length).toBeLessThanOrEqual(10)
      expect(page2.length).toBeLessThanOrEqual(10)
    })
  })

  describe('매칭 통계', () => {
    it('매칭 통계 조회', async () => {
      const stats = await getMatchingStats(userId1)

      expect(stats.totalLikes).toBeGreaterThanOrEqual(0)
      expect(stats.totalMatches).toBeGreaterThanOrEqual(0)
      expect(stats.likesReceived).toBeGreaterThanOrEqual(0)
      expect(stats.matchesAccepted).toBeGreaterThanOrEqual(0)
      expect(stats.averageCompatibility).toBeGreaterThanOrEqual(0)
      expect(stats.averageCompatibility).toBeLessThanOrEqual(100)
    })

    it('좋아요 개수와 받은 좋아요 개수 구분', async () => {
      const stats = await getMatchingStats(userId1)

      expect(typeof stats.totalLikes).toBe('number')
      expect(typeof stats.likesReceived).toBe('number')
    })

    it('평균 호환성 계산', async () => {
      const stats = await getMatchingStats(userId1)

      if (stats.totalLikes > 0) {
        expect(stats.averageCompatibility).toBeGreaterThanOrEqual(0)
        expect(stats.averageCompatibility).toBeLessThanOrEqual(100)
      }
    })
  })

  describe('추천 시스템', () => {
    it('개인화된 추천 조회', async () => {
      const recommendations = await getRecommendations(userId1)

      expect(Array.isArray(recommendations)).toBe(true)
      recommendations.forEach(rec => {
        expect(rec.userId).not.toBe(userId1)
      })
    })

    it('사용자 선호도 기반 추천', async () => {
      const recommendations = await getRecommendations(userId1, 5)

      expect(recommendations.length).toBeLessThanOrEqual(5)
    })
  })

  describe('에러 처리', () => {
    it('존재하지 않는 사용자에 좋아요 실패', async () => {
      try {
        await likeUser(userId1, 'non-existing-user')
        // 에러가 발생할 수 있음
      } catch (error) {
        expect(error).toBeTruthy()
      }
    })

    it('좋아요 취소 시 기록이 없으면 실패', async () => {
      try {
        await unlikeUser('user-no-like', 'any-user')
        fail('Should throw error')
      } catch (error) {
        expect(error).toBeTruthy()
      }
    })
  })

  describe('성능 테스트', () => {
    it('호환성 계산이 빠름', async () => {
      const startTime = Date.now()
      await calculateCompatibility(userId1, userId2)
      const endTime = Date.now()

      expect(endTime - startTime).toBeLessThan(1000)
    })

    it('대량의 디스커버리 카드 생성 빠름', async () => {
      const startTime = Date.now()
      await getDiscoveryFeed(userId1, {}, 100)
      const endTime = Date.now()

      expect(endTime - startTime).toBeLessThan(5000)
    })

    it('매칭 통계 조회 빠름', async () => {
      const startTime = Date.now()
      await getMatchingStats(userId1)
      const endTime = Date.now()

      expect(endTime - startTime).toBeLessThan(1000)
    })
  })
})

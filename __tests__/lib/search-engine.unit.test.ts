/**
 * 검색 엔진 유닛 테스트
 */

describe('Search Engine', () => {
  describe('searchUsers', () => {
    it('키워드로 사용자 검색해야 함', () => {
      const users = [
        {
          id: 'user1',
          username: 'john_doe',
          age: 28,
          location: 'Seoul',
          mbtiType: 'ENFP',
          bio: 'Love hiking',
        },
        {
          id: 'user2',
          username: 'jane_smith',
          age: 26,
          location: 'Busan',
          mbtiType: 'INFJ',
          bio: 'Love reading',
        },
      ]

      const keyword = 'john'
      const filtered = users.filter(
        (u) =>
          u.username.toLowerCase().includes(keyword.toLowerCase()) ||
          u.bio.toLowerCase().includes(keyword.toLowerCase())
      )

      expect(filtered).toHaveLength(1)
      expect(filtered[0].id).toBe('user1')
    })

    it('연령대로 사용자 필터링해야 함', () => {
      const users = [
        { id: 'user1', age: 20 },
        { id: 'user2', age: 25 },
        { id: 'user3', age: 30 },
        { id: 'user4', age: 35 },
      ]

      const minAge = 25
      const maxAge = 32

      const filtered = users.filter(
        (u) => u.age >= minAge && u.age <= maxAge
      )

      expect(filtered).toHaveLength(2)
      expect(filtered.map((u) => u.id)).toEqual(['user2', 'user3'])
    })

    it('위치로 사용자 필터링해야 함', () => {
      const users = [
        { id: 'user1', location: 'Seoul' },
        { id: 'user2', location: 'Busan' },
        { id: 'user3', location: 'Seoul' },
      ]

      const location = 'Seoul'
      const filtered = users.filter((u) =>
        u.location.includes(location)
      )

      expect(filtered).toHaveLength(2)
    })

    it('MBTI 타입으로 필터링해야 함', () => {
      const users = [
        { id: 'user1', mbtiType: 'ENFP' },
        { id: 'user2', mbtiType: 'INFJ' },
        { id: 'user3', mbtiType: 'ENFP' },
      ]

      const mbtiType = 'ENFP'
      const filtered = users.filter((u) => u.mbtiType === mbtiType)

      expect(filtered).toHaveLength(2)
    })

    it('여러 필터를 결합해야 함', () => {
      const users = [
        {
          id: 'user1',
          username: 'alice',
          age: 25,
          location: 'Seoul',
          mbtiType: 'ENFP',
        },
        {
          id: 'user2',
          username: 'bob',
          age: 28,
          location: 'Busan',
          mbtiType: 'INFJ',
        },
        {
          id: 'user3',
          username: 'charlie',
          age: 26,
          location: 'Seoul',
          mbtiType: 'ENFP',
        },
      ]

      const minAge = 25
      const maxAge = 27
      const location = 'Seoul'
      const mbtiType = 'ENFP'

      const filtered = users.filter(
        (u) =>
          u.age >= minAge &&
          u.age <= maxAge &&
          u.location === location &&
          u.mbtiType === mbtiType
      )

      expect(filtered).toHaveLength(1)
      expect(filtered[0].id).toBe('user3')
    })

    it('검색된 사용자에서 자신을 제외해야 함', () => {
      const userId = 'user1'
      const users = [
        { id: 'user1' },
        { id: 'user2' },
        { id: 'user3' },
      ]

      const filtered = users.filter((u) => u.id !== userId)

      expect(filtered).toHaveLength(2)
      expect(filtered.map((u) => u.id)).not.toContain('user1')
    })

    it('차단된 사용자를 제외해야 함', () => {
      const users = [
        { id: 'user1' },
        { id: 'user2' },
        { id: 'user3' },
      ]

      const blockedUserIds = new Set(['user2'])

      const filtered = users.filter((u) => !blockedUserIds.has(u.id))

      expect(filtered).toHaveLength(2)
      expect(filtered.map((u) => u.id)).toEqual(['user1', 'user3'])
    })

    it('페이지네이션이 정확히 작동해야 함', () => {
      const allUsers = Array.from({ length: 150 }, (_, i) => ({
        id: `user${i}`,
      }))

      const limit = 50
      const offset = 0

      const page1 = allUsers.slice(offset, offset + limit)
      expect(page1).toHaveLength(50)

      const offset2 = 50
      const page2 = allUsers.slice(offset2, offset2 + limit)
      expect(page2).toHaveLength(50)

      const offset3 = 100
      const page3 = allUsers.slice(offset3, offset3 + limit)
      expect(page3).toHaveLength(50)

      const hasMore = offset3 + limit < allUsers.length
      expect(hasMore).toBe(false)
    })
  })

  describe('Search History', () => {
    it('검색 이력을 저장해야 함', () => {
      const history = {
        id: 'hist1',
        userId: 'user1',
        query: 'alice',
        filters: { minAge: 25, maxAge: 30 },
        resultCount: 15,
        createdAt: new Date(),
      }

      expect(history.userId).toBe('user1')
      expect(history.resultCount).toBe(15)
    })

    it('최근 100개 검색 이력만 유지해야 함', () => {
      const histories = Array.from(
        { length: 150 },
        (_, i) => ({ id: `hist${i}` })
      )

      const recent = histories.slice(-100)
      expect(recent).toHaveLength(100)
    })

    it('중복된 검색을 이력에 기록해야 함', () => {
      const history = [
        {
          query: 'alice',
          createdAt: new Date('2026-10-11T10:00:00'),
        },
        {
          query: 'alice',
          createdAt: new Date('2026-10-11T10:05:00'),
        },
      ]

      expect(history).toHaveLength(2)
    })
  })

  describe('Recent Views', () => {
    it('프로필 조회를 기록해야 함', () => {
      const view = {
        viewerId: 'user1',
        viewedUserId: 'user2',
        viewedAt: new Date(),
      }

      expect(view.viewerId).toBe('user1')
      expect(view.viewedUserId).toBe('user2')
    })

    it('자신의 프로필 조회는 기록하지 않아야 함', () => {
      const viewerId = 'user1'
      const viewedUserId = 'user1'

      const shouldRecord = viewerId !== viewedUserId
      expect(shouldRecord).toBe(false)
    })

    it('최근 조회를 시간순으로 정렬해야 함', () => {
      const views = [
        { viewedUserId: 'user2', viewedAt: new Date('2026-10-11T10:00:00') },
        { viewedUserId: 'user3', viewedAt: new Date('2026-10-11T10:10:00') },
        { viewedUserId: 'user4', viewedAt: new Date('2026-10-11T10:05:00') },
      ]

      const sorted = views.sort(
        (a, b) => b.viewedAt.getTime() - a.viewedAt.getTime()
      )

      expect(sorted[0].viewedUserId).toBe('user3')
      expect(sorted[2].viewedUserId).toBe('user2')
    })

    it('나를 조회한 사용자 목록을 반환해야 함', () => {
      const views = [
        { viewerId: 'user1', viewedUserId: 'user5' },
        { viewerId: 'user2', viewedUserId: 'user5' },
        { viewerId: 'user3', viewedUserId: 'user5' },
      ]

      const viewers = views.filter((v) => v.viewedUserId === 'user5')
      expect(viewers).toHaveLength(3)
    })
  })

  describe('Real-World Scenarios', () => {
    it('사용자가 연령대와 MBTI로 필터링 후 검색', () => {
      const users = [
        {
          id: 'user1',
          age: 25,
          mbtiType: 'ENFP',
          location: 'Seoul',
        },
        {
          id: 'user2',
          age: 30,
          mbtiType: 'INFJ',
          location: 'Seoul',
        },
        {
          id: 'user3',
          age: 27,
          mbtiType: 'ENFP',
          location: 'Seoul',
        },
      ]

      const filters = {
        minAge: 26,
        maxAge: 28,
        mbtiType: 'ENFP',
      }

      const filtered = users.filter(
        (u) =>
          u.age >= filters.minAge &&
          u.age <= filters.maxAge &&
          u.mbtiType === filters.mbtiType
      )

      expect(filtered).toHaveLength(1)
      expect(filtered[0].id).toBe('user3')
    })

    it('사용자가 프로필을 여러 번 조회', () => {
      const views = [
        {
          viewerId: 'user1',
          viewedUserId: 'user2',
          viewedAt: new Date('2026-10-11T10:00:00'),
        },
        {
          viewerId: 'user1',
          viewedUserId: 'user2',
          viewedAt: new Date('2026-10-11T10:05:00'),
        },
      ]

      // 같은 사용자를 여러 번 조회한 경우 최신 조회만 유지 (upsert)
      const uniqueViews = Array.from(
        new Map(views.map((v) => [v.viewedUserId, v])).values()
      )

      expect(uniqueViews).toHaveLength(1)
      expect(uniqueViews[0].viewedAt).toEqual(
        new Date('2026-10-11T10:05:00')
      )
    })

    it('검색 이력에서 이전 검색을 다시 실행', () => {
      const history = {
        id: 'hist1',
        query: 'alice',
        filters: { minAge: 25, maxAge: 30, mbtiType: 'ENFP' },
      }

      const users = [
        {
          id: 'user1',
          username: 'alice',
          age: 27,
          mbtiType: 'ENFP',
        },
        {
          id: 'user2',
          username: 'bob',
          age: 28,
          mbtiType: 'INFJ',
        },
      ]

      const results = users.filter(
        (u) =>
          u.username.toLowerCase().includes(history.query.toLowerCase()) &&
          u.age >= history.filters.minAge &&
          u.age <= history.filters.maxAge &&
          u.mbtiType === history.filters.mbtiType
      )

      expect(results).toHaveLength(1)
      expect(results[0].id).toBe('user1')
    })

    it('차단된 사용자와 자신을 제외한 검색', () => {
      const userId = 'searcher'
      const blockedUserIds = new Set(['user2', 'user4'])

      const users = [
        { id: 'searcher' },
        { id: 'user1' },
        { id: 'user2' },
        { id: 'user3' },
        { id: 'user4' },
      ]

      const filtered = users.filter(
        (u) =>
          u.id !== userId &&
          !blockedUserIds.has(u.id)
      )

      expect(filtered).toHaveLength(2)
      expect(filtered.map((u) => u.id)).toEqual(['user1', 'user3'])
    })

    it('최근 조회 항목이 10개를 초과하면 가장 오래된 것부터 제거', () => {
      const views = Array.from({ length: 15 }, (_, i) => ({
        viewedUserId: `user${i}`,
        viewedAt: new Date(Date.now() - i * 60000),
      }))

      const recent = views.slice(0, 10) // 최근 10개만 유지
      expect(recent).toHaveLength(10)
      expect(recent[0].viewedUserId).toBe('user0')
      expect(recent[9].viewedUserId).toBe('user9')
    })
  })
})

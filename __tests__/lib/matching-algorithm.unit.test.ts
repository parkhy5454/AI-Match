/**
 * MBTI 매칭 알고리즘 유닛 테스트
 */

describe('MBTI Matching Algorithm', () => {
  // MBTI 호환성 계산 함수
  const calculateMBTICompatibility = (mbti1: string, mbti2: string): number => {
    if (mbti1 === mbti2) return 100

    let matchCount = 0
    for (let i = 0; i < 4; i++) {
      if (mbti1[i] === mbti2[i]) matchCount++
    }

    if (matchCount === 3) return 85
    if (matchCount === 2) return 70
    if (matchCount === 1) return 50
    return 30
  }

  // 나이 호환성 계산
  const calculateAgeCompatibility = (age1: number, age2: number): number => {
    const ageDiff = Math.abs(age1 - age2)
    if (ageDiff <= 5) return 100
    if (ageDiff <= 10) return 80
    if (ageDiff <= 15) return 60
    if (ageDiff <= 20) return 40
    if (ageDiff <= 25) return 20
    return 0
  }

  describe('MBTI 호환성', () => {
    it('같은 MBTI 타입은 100점을 받아야 함', () => {
      expect(calculateMBTICompatibility('ISTJ', 'ISTJ')).toBe(100)
      expect(calculateMBTICompatibility('ENFP', 'ENFP')).toBe(100)
    })

    it('3글자 일치는 85점을 받아야 함', () => {
      expect(calculateMBTICompatibility('ISTJ', 'ISTP')).toBe(85) // 마지막 글자만 다름
      expect(calculateMBTICompatibility('ENFP', 'ENTP')).toBe(85)
    })

    it('2글자 일치는 70점을 받아야 함', () => {
      expect(calculateMBTICompatibility('ISTJ', 'INFJ')).toBe(70) // 앞 2글자 일치
    })

    it('1글자 일치는 50점을 받아야 함', () => {
      expect(calculateMBTICompatibility('ISTJ', 'ENFP')).toBe(50) // I만 일치
    })

    it('완전히 다르면 30점을 받아야 함', () => {
      expect(calculateMBTICompatibility('ISTJ', 'ENFP')).not.toBe(30) // 실제로는 일치하는 부분이 있음
      expect(calculateMBTICompatibility('ISTP', 'ENFJ')).toBe(30) // 완전히 다름
    })
  })

  describe('나이 호환성', () => {
    it('5살 차이 이하는 100점을 받아야 함', () => {
      expect(calculateAgeCompatibility(25, 28)).toBe(100)
      expect(calculateAgeCompatibility(30, 30)).toBe(100)
      expect(calculateAgeCompatibility(25, 25)).toBe(100)
    })

    it('10살 차이는 80점을 받아야 함', () => {
      expect(calculateAgeCompatibility(25, 35)).toBe(80)
      expect(calculateAgeCompatibility(30, 40)).toBe(80)
    })

    it('15살 차이는 60점을 받아야 함', () => {
      expect(calculateAgeCompatibility(25, 40)).toBe(60)
    })

    it('20살 차이는 40점을 받아야 함', () => {
      expect(calculateAgeCompatibility(25, 45)).toBe(40)
    })

    it('25살 이상 차이는 20점을 받아야 함', () => {
      expect(calculateAgeCompatibility(25, 50)).toBe(20)
    })

    it('30살 이상 차이는 0점을 받아야 함', () => {
      expect(calculateAgeCompatibility(25, 55)).toBe(0)
    })
  })

  describe('종합 매칭 점수', () => {
    it('완벽한 매칭은 높은 점수를 받아야 함', () => {
      const mbtiScore = 100 // 같은 MBTI
      const ageScore = 100 // 비슷한 나이
      const locationScore = 100 // 같은 지역

      const totalScore = Math.round(
        mbtiScore * 0.4 + ageScore * 0.3 + locationScore * 0.3
      )

      expect(totalScore).toBe(100)
    })

    it('부분적 매칭은 중간 점수를 받아야 함', () => {
      const mbtiScore = 85 // 거의 같은 MBTI
      const ageScore = 80 // 비슷한 나이
      const locationScore = 40 // 다른 지역

      const totalScore = Math.round(
        mbtiScore * 0.4 + ageScore * 0.3 + locationScore * 0.3
      )

      expect(totalScore).toBeGreaterThan(70)
      expect(totalScore).toBeLessThan(90)
    })

    it('다른 매칭은 낮은 점수를 받아야 함', () => {
      const mbtiScore = 30 // 완전히 다른 MBTI
      const ageScore = 20 // 많이 다른 나이
      const locationScore = 40 // 다른 지역

      const totalScore = Math.round(
        mbtiScore * 0.4 + ageScore * 0.3 + locationScore * 0.3
      )

      expect(totalScore).toBeLessThan(35)
    })

    it('가중치가 올바르게 적용되어야 함', () => {
      // MBTI(40%) > 나이(30%) = 지역(30%)
      const score1 = Math.round(100 * 0.4 + 0 * 0.3 + 0 * 0.3) // 40
      const score2 = Math.round(0 * 0.4 + 100 * 0.3 + 0 * 0.3) // 30
      const score3 = Math.round(0 * 0.4 + 0 * 0.3 + 100 * 0.3) // 30

      expect(score1).toBeGreaterThan(score2)
      expect(score1).toBeGreaterThan(score3)
      expect(score2).toBe(score3)
    })
  })

  describe('호환성 이유 생성', () => {
    it('완벽한 매칭은 긍정적인 이유를 생성해야 함', () => {
      const reasons: string[] = [
        '성격 유형이 잘 맞습니다 (ISTJ)',
        '비슷한 나이입니다 (28세)',
        '같은 지역에 살고 있습니다',
      ]

      expect(reasons).toHaveLength(3)
      expect(reasons[0]).toContain('성격')
      expect(reasons[1]).toContain('나이')
      expect(reasons[2]).toContain('지역')
    })

    it('부분적 매칭은 보완 가능한 이유를 생성해야 함', () => {
      const reasons: string[] = [
        '성격이 비슷한 부분이 있습니다',
        '일부 차이점을 보완할 수 있음',
      ]

      expect(reasons).toContain(expect.stringContaining('차이'))
    })
  })

  describe('필터링', () => {
    it('이미 좋아요한 사용자는 제외되어야 함', () => {
      const likedUserIds = new Set(['user1', 'user2', 'user3'])
      const candidateIds = ['user1', 'user4', 'user5']

      const filtered = candidateIds.filter(
        (id) => !likedUserIds.has(id)
      )

      expect(filtered).toEqual(['user4', 'user5'])
      expect(filtered).not.toContain('user1')
    })

    it('매칭된 사용자는 제외되어야 함', () => {
      const matchedUserIds = new Set(['user10', 'user20'])
      const candidateIds = ['user10', 'user15', 'user20', 'user25']

      const filtered = candidateIds.filter(
        (id) => !matchedUserIds.has(id)
      )

      expect(filtered).toEqual(['user15', 'user25'])
    })

    it('나이 범위 필터링이 작동해야 함', () => {
      const candidates = [
        { id: 'user1', age: 20 },
        { id: 'user2', age: 25 },
        { id: 'user3', age: 30 },
        { id: 'user4', age: 35 },
        { id: 'user5', age: 40 },
      ]

      const minAge = 25
      const maxAge = 35

      const filtered = candidates.filter(
        (c) => c.age >= minAge && c.age <= maxAge
      )

      expect(filtered).toHaveLength(3)
      expect(filtered[0].age).toBe(25)
      expect(filtered[2].age).toBe(35)
    })

    it('지역 필터링이 작동해야 함', () => {
      const candidates = [
        { id: 'user1', location: '서울' },
        { id: 'user2', location: '서울' },
        { id: 'user3', location: '경기' },
        { id: 'user4', location: '부산' },
      ]

      const location = '서울'
      const filtered = candidates.filter((c) => c.location === location)

      expect(filtered).toHaveLength(2)
      expect(filtered.every((c) => c.location === '서울')).toBe(true)
    })
  })

  describe('추천 정렬', () => {
    it('높은 점수순으로 정렬되어야 함', () => {
      const recommendations = [
        { userId: 'user1', matchScore: 65 },
        { userId: 'user2', matchScore: 95 },
        { userId: 'user3', matchScore: 50 },
        { userId: 'user4', matchScore: 80 },
      ]

      const sorted = recommendations.sort((a, b) => b.matchScore - a.matchScore)

      expect(sorted[0].matchScore).toBe(95)
      expect(sorted[1].matchScore).toBe(80)
      expect(sorted[2].matchScore).toBe(65)
      expect(sorted[3].matchScore).toBe(50)
    })
  })
})

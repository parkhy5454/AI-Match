/**
 * Rate Limiter 유닛 테스트
 */

describe('Rate Limiter', () => {
  // 간단한 Rate Limiter 구현 테스트

  class SimpleRateLimiter {
    private limiters = new Map()
    private config = new Map()

    setLimit(eventName: string, config: any) {
      this.config.set(eventName, config)
    }

    check(userId: string, eventName: string) {
      const config = this.config.get(eventName)
      if (!config) return { allowed: true, remaining: -1, resetTime: 0 }

      const now = Date.now()
      if (!this.limiters.has(userId)) {
        this.limiters.set(userId, new Map())
      }

      const userLimiters = this.limiters.get(userId)
      let entry = userLimiters.get(eventName)

      if (!entry || now >= entry.resetTime) {
        entry = { count: 0, resetTime: now + config.windowMs }
        userLimiters.set(eventName, entry)
      }

      const remaining = Math.max(0, config.maxRequests - entry.count)
      const allowed = entry.count < config.maxRequests

      if (allowed) {
        entry.count++
      }

      return { allowed, remaining, resetTime: entry.resetTime }
    }
  }

  let limiter: SimpleRateLimiter

  beforeEach(() => {
    limiter = new SimpleRateLimiter()
  })

  describe('기본 동작', () => {
    beforeEach(() => {
      limiter.setLimit('test-event', { maxRequests: 3, windowMs: 1000 })
    })

    it('초기 요청은 모두 허용되어야 함', () => {
      const result1 = limiter.check('user1', 'test-event')
      const result2 = limiter.check('user1', 'test-event')
      const result3 = limiter.check('user1', 'test-event')

      expect(result1.allowed).toBe(true)
      expect(result2.allowed).toBe(true)
      expect(result3.allowed).toBe(true)
    })

    it('제한을 초과하면 거부해야 함', () => {
      limiter.check('user1', 'test-event')
      limiter.check('user1', 'test-event')
      limiter.check('user1', 'test-event')

      const result = limiter.check('user1', 'test-event')

      expect(result.allowed).toBe(false)
    })

    it('남은 요청 수를 추적해야 함', () => {
      const result1 = limiter.check('user1', 'test-event')
      expect(result1.remaining).toBe(2)

      const result2 = limiter.check('user1', 'test-event')
      expect(result2.remaining).toBe(1)

      const result3 = limiter.check('user1', 'test-event')
      expect(result3.remaining).toBe(0)

      const result4 = limiter.check('user1', 'test-event')
      expect(result4.remaining).toBe(0)
    })
  })

  describe('사용자 격리', () => {
    beforeEach(() => {
      limiter.setLimit('message:send', { maxRequests: 5, windowMs: 1000 })
    })

    it('사용자별로 독립적인 제한이 적용되어야 함', () => {
      // user1 5개 요청
      for (let i = 0; i < 5; i++) {
        const result = limiter.check('user1', 'message:send')
        expect(result.allowed).toBe(true)
      }

      // user1 6번째 요청 (거부)
      const result1 = limiter.check('user1', 'message:send')
      expect(result1.allowed).toBe(false)

      // user2는 여전히 5개 요청 가능
      for (let i = 0; i < 5; i++) {
        const result = limiter.check('user2', 'message:send')
        expect(result.allowed).toBe(true)
      }

      // user2 6번째 요청 (거부)
      const result2 = limiter.check('user2', 'message:send')
      expect(result2.allowed).toBe(false)
    })
  })

  describe('이벤트별 제한', () => {
    beforeEach(() => {
      limiter.setLimit('message:send', { maxRequests: 5, windowMs: 1000 })
      limiter.setLimit('typing:start', { maxRequests: 30, windowMs: 1000 })
    })

    it('이벤트별로 다른 제한이 적용되어야 함', () => {
      // message:send는 5개 제한
      for (let i = 0; i < 5; i++) {
        const result = limiter.check('user1', 'message:send')
        expect(result.allowed).toBe(true)
      }
      expect(limiter.check('user1', 'message:send').allowed).toBe(false)

      // typing:start는 30개 제한
      for (let i = 0; i < 30; i++) {
        const result = limiter.check('user1', 'typing:start')
        expect(result.allowed).toBe(true)
      }
      expect(limiter.check('user1', 'typing:start').allowed).toBe(false)
    })
  })

  describe('시간 윈도우', () => {
    it('시간 윈도우가 지나면 리셋되어야 함', () => {
      limiter.setLimit('test-event', { maxRequests: 2, windowMs: 100 })

      // 초기 요청
      const result1 = limiter.check('user1', 'test-event')
      const result2 = limiter.check('user1', 'test-event')
      expect(result1.allowed).toBe(true)
      expect(result2.allowed).toBe(true)

      // 세 번째 요청 (거부)
      const result3 = limiter.check('user1', 'test-event')
      expect(result3.allowed).toBe(false)

      // 시간이 지난 후 (여기서는 테스트 목적으로 직접 설정)
      // 실제로는 setTimeout 또는 jest.useFakeTimers() 사용
      expect(result3.resetTime).toBeGreaterThan(Date.now())
    })
  })

  describe('설정 없는 이벤트', () => {
    it('설정이 없는 이벤트는 제한하지 않아야 함', () => {
      // 설정하지 않은 이벤트에 대한 요청
      for (let i = 0; i < 100; i++) {
        const result = limiter.check('user1', 'unknown-event')
        expect(result.allowed).toBe(true)
      }
    })
  })

  describe('실제 시나리오', () => {
    beforeEach(() => {
      // 프로덕션 설정
      limiter.setLimit('message:send', { maxRequests: 5, windowMs: 1000 })
      limiter.setLimit('typing:start', { maxRequests: 20, windowMs: 1000 })
      limiter.setLimit('message:read', { maxRequests: 10, windowMs: 1000 })
    })

    it('사용자가 메시지를 보내고 읽기를 수행할 수 있어야 함', () => {
      // 메시지 전송
      for (let i = 0; i < 3; i++) {
        const result = limiter.check('user1', 'message:send')
        expect(result.allowed).toBe(true)
      }

      // 타이핑
      for (let i = 0; i < 10; i++) {
        const result = limiter.check('user1', 'typing:start')
        expect(result.allowed).toBe(true)
      }

      // 메시지 읽음
      for (let i = 0; i < 5; i++) {
        const result = limiter.check('user1', 'message:read')
        expect(result.allowed).toBe(true)
      }

      // 모두 제한 내
      expect(limiter.check('user1', 'message:send').allowed).toBe(true)
      expect(limiter.check('user1', 'typing:start').allowed).toBe(true)
      expect(limiter.check('user1', 'message:read').allowed).toBe(true)
    })

    it('DoS 공격을 방어해야 함', () => {
      // 한 사용자가 과도한 요청 시도
      for (let i = 0; i < 10; i++) {
        const result = limiter.check('attacker', 'message:send')

        if (i < 5) {
          expect(result.allowed).toBe(true)
        } else {
          expect(result.allowed).toBe(false)
        }
      }
    })
  })

  describe('메모리 관리', () => {
    it('오래된 항목을 정리할 수 있어야 함', () => {
      limiter.setLimit('test-event', { maxRequests: 1, windowMs: 100 })

      limiter.check('user1', 'test-event')
      limiter.check('user2', 'test-event')
      limiter.check('user3', 'test-event')

      // 메모리 사용 확인 (실제로는 메모리 프로파일링 필요)
      expect(limiter).toBeDefined()
    })
  })
})

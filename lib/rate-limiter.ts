/**
 * Rate Limiter for WebSocket Events
 * WebSocket 이벤트의 속도 제한으로 서버 보호
 */

interface RateLimitConfig {
  maxRequests: number;
  windowMs: number; // 시간 창 (밀리초)
  message?: string;
}

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

/**
 * 메모리 기반 레이트 리미터
 * 사용자별, 이벤트별 요청 제한
 */
export class RateLimiter {
  private limiters: Map<string, Map<string, RateLimitEntry>> = new Map();
  private config: Map<string, RateLimitConfig> = new Map();

  /**
   * 레이트 리미터 설정
   * @param eventName - 이벤트 이름
   * @param config - 설정 (maxRequests, windowMs)
   */
  setLimit(eventName: string, config: RateLimitConfig) {
    this.config.set(eventName, {
      maxRequests: config.maxRequests,
      windowMs: config.windowMs,
      message: config.message || `Rate limit exceeded for ${eventName}`,
    });
  }

  /**
   * 요청이 제한을 초과했는지 확인
   * @param userId - 사용자 ID
   * @param eventName - 이벤트 이름
   * @returns { allowed: boolean, remaining: number, resetTime: number }
   */
  check(userId: string, eventName: string): { allowed: boolean; remaining: number; resetTime: number } {
    const config = this.config.get(eventName);

    // 설정되지 않은 이벤트는 제한 없음
    if (!config) {
      return { allowed: true, remaining: -1, resetTime: 0 };
    }

    const now = Date.now();
    const key = `${userId}:${eventName}`;

    // 사용자의 이벤트 맵이 없으면 생성
    if (!this.limiters.has(userId)) {
      this.limiters.set(userId, new Map());
    }

    const userLimiters = this.limiters.get(userId)!;
    let entry = userLimiters.get(eventName);

    // 기존 항목이 없거나 시간 창이 지났으면 새로 생성
    if (!entry || now >= entry.resetTime) {
      entry = {
        count: 0,
        resetTime: now + config.windowMs,
      };
      userLimiters.set(eventName, entry);
    }

    const remaining = Math.max(0, config.maxRequests - entry.count);
    const allowed = entry.count < config.maxRequests;

    if (allowed) {
      entry.count++;
    }

    return {
      allowed,
      remaining,
      resetTime: entry.resetTime,
    };
  }

  /**
   * 사용자의 모든 제한 정보 조회
   */
  getStatus(userId: string): Record<string, { count: number; limit: number; resetTime: number }> {
    const userLimiters = this.limiters.get(userId);
    const status: Record<string, any> = {};

    if (!userLimiters) {
      return status;
    }

    userLimiters.forEach((entry, eventName) => {
      const config = this.config.get(eventName);
      if (config) {
        status[eventName] = {
          count: entry.count,
          limit: config.maxRequests,
          resetTime: entry.resetTime,
          remaining: Math.max(0, config.maxRequests - entry.count),
        };
      }
    });

    return status;
  }

  /**
   * 사용자 데이터 정리 (1시간 이상 비활성)
   */
  cleanup(maxAge: number = 60 * 60 * 1000) {
    const now = Date.now();

    this.limiters.forEach((userLimiters, userId) => {
      let hasEntries = false;

      userLimiters.forEach((entry, eventName) => {
        // 시간 창이 만료되지 않으면 유지
        if (entry.resetTime > now) {
          hasEntries = true;
        } else {
          userLimiters.delete(eventName);
        }
      });

      // 항목이 없으면 사용자 데이터 삭제
      if (!hasEntries) {
        this.limiters.delete(userId);
      }
    });
  }

  /**
   * 전체 상태 조회 (디버깅용)
   */
  getGlobalStatus() {
    const status: Record<string, any> = {};
    let totalUsers = 0;
    let totalEntries = 0;

    this.limiters.forEach((userLimiters, userId) => {
      totalUsers++;
      totalEntries += userLimiters.size;
    });

    return {
      totalUsers,
      totalRateLimitedEvents: totalEntries,
      configuredEvents: Array.from(this.config.keys()),
      activeLimits: Array.from(this.config.entries()).map(([event, config]) => ({
        event,
        maxRequests: config.maxRequests,
        windowMs: config.windowMs,
        requestsPerSecond: (config.maxRequests / config.windowMs) * 1000,
      })),
    };
  }
}

/**
 * 기본 WebSocket 이벤트 레이트 리미터 프리셋
 */
export const defaultWebSocketLimits = {
  // 메시징 (높은 빈도, 느슨한 제한)
  'message:send': { maxRequests: 10, windowMs: 1000 }, // 초당 10개
  'chat:message': { maxRequests: 10, windowMs: 1000 }, // 초당 10개
  'message:read': { maxRequests: 20, windowMs: 1000 }, // 초당 20개

  // 타이핑 표시 (매우 높은 빈도)
  'typing:start': { maxRequests: 30, windowMs: 1000 }, // 초당 30개
  'typing:stop': { maxRequests: 30, windowMs: 1000 }, // 초당 30개

  // 채팅방 (중간 빈도)
  'chat:join': { maxRequests: 5, windowMs: 1000 }, // 초당 5개
  'chat:leave': { maxRequests: 5, windowMs: 1000 }, // 초당 5개

  // 통화 (낮은 빈도)
  'call:initiate': { maxRequests: 3, windowMs: 5000 }, // 5초당 3개
  'call:answer': { maxRequests: 3, windowMs: 5000 },
  'call:decline': { maxRequests: 3, windowMs: 5000 },
  'call:end': { maxRequests: 3, windowMs: 5000 },

  // WebRTC 시그널링 (높은 빈도)
  'webrtc:offer': { maxRequests: 5, windowMs: 1000 }, // 초당 5개
  'webrtc:answer': { maxRequests: 5, windowMs: 1000 },
  'webrtc:ice-candidate': { maxRequests: 100, windowMs: 1000 }, // 초당 100개 (ICE는 많음)

  // 상태 업데이트 (낮은 빈도)
  'presence:update': { maxRequests: 2, windowMs: 1000 }, // 초당 2개

  // 시스템 이벤트 (매우 낮은 빈도)
  'ping': { maxRequests: 60, windowMs: 1000 }, // 초당 60개 (하트비트용)
};

/**
 * 프로덕션 용 더 엄격한 레이트 리미터 프리셋
 */
export const productionWebSocketLimits = {
  'message:send': { maxRequests: 5, windowMs: 1000 },
  'chat:message': { maxRequests: 5, windowMs: 1000 },
  'message:read': { maxRequests: 10, windowMs: 1000 },
  'typing:start': { maxRequests: 20, windowMs: 1000 },
  'typing:stop': { maxRequests: 20, windowMs: 1000 },
  'chat:join': { maxRequests: 3, windowMs: 1000 },
  'chat:leave': { maxRequests: 3, windowMs: 1000 },
  'call:initiate': { maxRequests: 2, windowMs: 5000 },
  'call:answer': { maxRequests: 2, windowMs: 5000 },
  'call:decline': { maxRequests: 2, windowMs: 5000 },
  'call:end': { maxRequests: 2, windowMs: 5000 },
  'webrtc:offer': { maxRequests: 3, windowMs: 1000 },
  'webrtc:answer': { maxRequests: 3, windowMs: 1000 },
  'webrtc:ice-candidate': { maxRequests: 50, windowMs: 1000 },
  'presence:update': { maxRequests: 1, windowMs: 1000 },
  'ping': { maxRequests: 60, windowMs: 1000 },
};

export default RateLimiter;

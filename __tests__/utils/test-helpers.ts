/**
 * 테스트 헬퍼 함수
 * Mock 데이터 생성 및 테스트 설정
 */

import { createMocks } from 'node-mocks-http'
import type { NextApiRequest, NextApiResponse } from 'next'

/**
 * Mock 사용자 데이터
 */
export const mockUser = {
  id: 'user_123',
  username: 'testuser',
  email: 'test@example.com',
  password: 'hashedpassword',
  age: 25,
  gender: 'M',
  region: 'Seoul',
  mbti: 'ENFP',
  bio: 'Test bio',
  profileImage: 'https://example.com/image.jpg',
  points: 1000,
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
  phoneNumber: null,
  address: null,
  birthDate: null,
  notificationsEnabled: true,
  isPrivate: false,
  emailVerified: true,
  phoneVerified: false,
  photoVerified: false,
  isActive: true,
  accountStatus: 'active',
  suspendedUntil: null,
  reportCount: 0,
  referrerId: null,
}

/**
 * Mock JWT 토큰
 */
export const mockToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6InVzZXJfMTIzIiwiaWF0IjoxNjk0NzY0ODAwfQ.mock'

/**
 * Mock 파일 데이터
 */
export const mockFile = {
  id: 'file_123',
  uploaderId: 'user_123',
  fileName: '1729000000000-abc123.jpg',
  originalName: 'photo.jpg',
  fileType: 'image' as const,
  mimeType: 'image/jpeg',
  fileSize: 2048576,
  fileUrl: 'https://s3.example.com/uploads/images/user_123/photo.jpg',
  thumbnailUrl: 'https://s3.example.com/uploads/images/user_123/photo-thumbnail.jpg',
  duration: null,
  width: 1920,
  height: 1080,
  s3Key: 'uploads/images/user_123/1729000000000-abc123.jpg',
  uploadStatus: 'completed' as const,
  uploadedAt: new Date('2024-10-15T10:30:00Z'),
  updatedAt: new Date('2024-10-15T10:30:00Z'),
}

/**
 * Mock 메시지 데이터
 */
export const mockMessage = {
  id: 'msg_456',
  senderId: 'user_123',
  recipientId: 'user_456',
  content: 'Hello, World!',
  isRead: false,
  createdAt: new Date('2024-10-15T10:30:00Z'),
}

/**
 * Mock 채팅방 데이터
 */
export const mockChatRoom = {
  id: 'room_789',
  name: 'Test Room',
  type: 'direct' as const,
  creatorId: 'user_123',
  isActive: true,
  createdAt: new Date('2024-10-15T10:30:00Z'),
  updatedAt: new Date('2024-10-15T10:30:00Z'),
}

/**
 * HTTP 요청/응답 Mock 생성
 */
export function createMockHttpContext(
  method: string = 'GET',
  body?: any,
  headers?: Record<string, string>
) {
  const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
    method,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${mockToken}`,
      ...headers,
    },
    body,
  })

  return { req, res }
}

/**
 * Mock 데이터베이스 쿼리 결과
 */
export const mockDbResponses = {
  user: mockUser,
  file: mockFile,
  message: mockMessage,
  chatRoom: mockChatRoom,
}

/**
 * 테스트용 에러 메시지
 */
export const testErrors = {
  unauthorized: 'Unauthorized',
  notFound: 'Not found',
  badRequest: 'Bad request',
  forbidden: 'Forbidden',
  serverError: 'Internal server error',
}

/**
 * 테스트 데이터 생성기
 */
export class TestDataFactory {
  /**
   * 사용자 생성
   */
  static createUser(overrides = {}) {
    return {
      ...mockUser,
      id: `user_${Math.random().toString(36).substr(2, 9)}`,
      username: `user_${Math.random().toString(36).substr(2, 5)}`,
      email: `test_${Math.random().toString(36).substr(2, 5)}@example.com`,
      ...overrides,
    }
  }

  /**
   * 파일 생성
   */
  static createFile(overrides = {}) {
    const fileType = Math.random() > 0.5 ? 'image' : 'video'
    return {
      ...mockFile,
      id: `file_${Math.random().toString(36).substr(2, 9)}`,
      fileType,
      originalName: fileType === 'image' ? 'photo.jpg' : 'video.mp4',
      ...overrides,
    }
  }

  /**
   * 메시지 생성
   */
  static createMessage(overrides = {}) {
    return {
      ...mockMessage,
      id: `msg_${Math.random().toString(36).substr(2, 9)}`,
      content: `Test message ${Math.random().toString(36).substr(2, 9)}`,
      ...overrides,
    }
  }

  /**
   * 채팅방 생성
   */
  static createChatRoom(overrides = {}) {
    return {
      ...mockChatRoom,
      id: `room_${Math.random().toString(36).substr(2, 9)}`,
      name: `Room ${Math.random().toString(36).substr(2, 5)}`,
      ...overrides,
    }
  }
}

/**
 * Mock 시간 관리
 */
export class MockTime {
  private static fakeNow = new Date('2024-10-15T10:30:00Z')

  static now() {
    return this.fakeNow
  }

  static setTime(date: Date | string) {
    this.fakeNow = new Date(date)
  }

  static advance(ms: number) {
    this.fakeNow = new Date(this.fakeNow.getTime() + ms)
  }

  static reset() {
    this.fakeNow = new Date('2024-10-15T10:30:00Z')
  }
}

/**
 * 비동기 작업 대기
 */
export function waitFor(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

/**
 * 에러 예상
 */
export function expectError(fn: () => void, message?: string) {
  let error: Error | null = null
  try {
    fn()
  } catch (e) {
    error = e as Error
  }

  expect(error).not.toBeNull()
  if (message) {
    expect(error?.message).toContain(message)
  }
}

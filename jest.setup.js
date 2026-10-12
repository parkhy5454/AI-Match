/**
 * Jest 세팅
 * 테스트 전에 실행될 설정
 */

import '@testing-library/jest-dom'

// 환경 변수 설정
process.env.JWT_SECRET = 'test-secret-key-12345'
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/ai-match-test'
process.env.S3_BUCKET = 'ai-match-test-uploads'
process.env.S3_REGION = 'us-east-1'
process.env.NEXT_PUBLIC_API_URL = 'http://localhost:3000'
process.env.NODE_ENV = 'test'

// 전역 테스트 타임아웃
jest.setTimeout(10000)

// 콘솔 에러 억제 (필요한 경우만)
const originalError = console.error
beforeAll(() => {
  console.error = (...args) => {
    if (
      typeof args[0] === 'string' &&
      (args[0].includes('Warning: ReactDOM.render') ||
        args[0].includes('Not implemented: HTMLFormElement.prototype.submit'))
    ) {
      return
    }
    originalError.call(console, ...args)
  }
})

afterAll(() => {
  console.error = originalError
})

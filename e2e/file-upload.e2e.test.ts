/**
 * 파일 업로드 E2E 테스트
 * 실제 브라우저에서 사용자 워크플로우 테스트
 */

import { test, expect } from '@playwright/test'

test.describe('파일 업로드 워크플로우', () => {
  test.beforeEach(async ({ page }) => {
    // 로그인 페이지로 이동
    await page.goto('/login')

    // 테스트 계정으로 로그인
    await page.fill('input[type="email"]', 'test@example.com')
    await page.fill('input[type="password"]', 'password123')
    await page.click('button[type="submit"]')

    // 대시보드로 리다이렉트 대기
    await page.waitForURL('/dashboard')
  })

  test('이미지 파일 업로드', async ({ page }) => {
    // 파일 업로드 페이지로 이동
    await page.goto('/messages/upload')

    // 파일 업로드 영역 찾기
    const uploadArea = page.locator('[data-testid="file-upload"]')

    // 파일 선택
    await uploadArea.locator('input[type="file"]').setInputFiles('test-image.jpg')

    // 업로드 버튼 클릭
    await page.click('button:has-text("업로드")')

    // 성공 메시지 확인
    await expect(page.locator('text=업로드 완료')).toBeVisible()

    // 업로드된 파일 확인
    await expect(page.locator('text=test-image.jpg')).toBeVisible()
  })

  test('여러 파일 동시 업로드', async ({ page }) => {
    await page.goto('/messages/upload')

    const uploadArea = page.locator('[data-testid="file-upload"]')

    // 여러 파일 선택
    await uploadArea.locator('input[type="file"]').setInputFiles([
      'test-image-1.jpg',
      'test-image-2.jpg',
      'test-image-3.jpg',
    ])

    // 업로드 버튼 클릭
    await page.click('button:has-text("업로드")')

    // 진행 바 표시 확인
    await expect(page.locator('[data-testid="progress-bar"]')).toBeVisible()

    // 완료 메시지 확인
    await expect(page.locator('text=3개 파일이 업로드되었습니다')).toBeVisible()
  })

  test('드래그 앤 드롭 파일 업로드', async ({ page }) => {
    await page.goto('/messages/upload')

    const uploadArea = page.locator('[data-testid="file-upload"]')

    // 파일 드래그
    await uploadArea.setInputFiles('test-image.jpg')

    // 업로드 자동 시작 (드롭 후)
    await expect(page.locator('text=업로드 중')).toBeVisible()

    // 완료 대기
    await expect(page.locator('text=업로드 완료')).toBeVisible()
  })

  test('파일 크기 초과 오류 처리', async ({ page }) => {
    await page.goto('/messages/upload')

    // 큰 파일 생성 (50MB 이상)
    // 실제 테스트는 모의 파일 사용

    const uploadArea = page.locator('[data-testid="file-upload"]')
    await uploadArea.locator('input[type="file"]').setInputFiles('large-image.jpg')

    // 에러 메시지 확인
    await expect(page.locator('text=50MB')).toBeVisible()
  })

  test('지원하지 않는 파일 형식 거부', async ({ page }) => {
    await page.goto('/messages/upload')

    const uploadArea = page.locator('[data-testid="file-upload"]')
    await uploadArea.locator('input[type="file"]').setInputFiles('document.exe')

    // 에러 메시지 확인
    await expect(page.locator('text=지원하지 않는 파일 형식')).toBeVisible()
  })

  test('메시지에 파일 첨부', async ({ page }) => {
    // 메시지 페이지로 이동
    await page.goto('/messages/user_456')

    // 파일 첨부 버튼 클릭
    await page.click('[data-testid="attach-file"]')

    // 파일 선택
    const fileInput = page.locator('input[type="file"]')
    await fileInput.setInputFiles('test-image.jpg')

    // 메시지 입력
    await page.fill('textarea[placeholder="메시지를 입력하세요"]', 'Check this photo!')

    // 전송 버튼 클릭
    await page.click('button:has-text("전송")')

    // 메시지 확인
    await expect(page.locator('text=Check this photo!')).toBeVisible()

    // 이미지 썸네일 확인
    await expect(page.locator('img[alt="test-image.jpg"]')).toBeVisible()
  })

  test('저장소 쿼터 확인', async ({ page }) => {
    // 설정 페이지로 이동
    await page.goto('/settings/storage')

    // 저장소 정보 확인
    await expect(page.locator('[data-testid="storage-quota"]')).toBeVisible()

    // 사용 중인 용량 확인
    const usedStorage = page.locator('[data-testid="used-storage"]')
    await expect(usedStorage).toContainText(/\d+(\.\d+)?\s(MB|GB)/)

    // 남은 용량 확인
    const remaining = page.locator('[data-testid="remaining-storage"]')
    await expect(remaining).toContainText(/\d+(\.\d+)?\s(MB|GB)/)
  })

  test('파일 목록 조회', async ({ page }) => {
    // 파일 관리 페이지로 이동
    await page.goto('/files')

    // 파일 목록 확인
    await expect(page.locator('[data-testid="file-list"]')).toBeVisible()

    // 파일 항목 확인
    const fileItems = page.locator('[data-testid="file-item"]')
    const count = await fileItems.count()
    expect(count).toBeGreaterThan(0)
  })

  test('파일 삭제', async ({ page }) => {
    // 파일 관리 페이지로 이동
    await page.goto('/files')

    // 첫 번째 파일 항목 찾기
    const fileItem = page.locator('[data-testid="file-item"]').first()

    // 삭제 버튼 클릭
    await fileItem.locator('button[data-testid="delete-file"]').click()

    // 확인 다이얼로그
    await page.click('button:has-text("삭제")')

    // 성공 메시지 확인
    await expect(page.locator('text=파일이 삭제되었습니다')).toBeVisible()
  })

  test('파일 타입별 필터링', async ({ page }) => {
    await page.goto('/files')

    // 이미지 필터 선택
    await page.click('button[data-testid="filter-image"]')

    // 이미지만 표시되는지 확인
    const fileItems = page.locator('[data-testid="file-item"]')
    const count = await fileItems.count()

    for (let i = 0; i < count; i++) {
      const fileType = await fileItems.nth(i).locator('[data-testid="file-type"]').textContent()
      expect(fileType).toContain('image')
    }
  })

  test('파일 다운로드', async ({ page, context }) => {
    await page.goto('/files')

    // 파일 항목 찾기
    const fileItem = page.locator('[data-testid="file-item"]').first()

    // 다운로드 시작 대기
    const downloadPromise = context.waitForEvent('download')

    // 다운로드 버튼 클릭
    await fileItem.locator('button[data-testid="download-file"]').click()

    // 다운로드 완료 대기
    const download = await downloadPromise

    // 파일명 확인
    expect(download.suggestedFilename).toBeTruthy()
  })

  test('업로드 진행률 표시', async ({ page }) => {
    await page.goto('/messages/upload')

    const uploadArea = page.locator('[data-testid="file-upload"]')
    await uploadArea.locator('input[type="file"]').setInputFiles('test-image.jpg')

    // 진행 바 확인
    const progressBar = page.locator('[data-testid="progress-bar"]')

    // 진행률이 증가하는지 확인
    const initialValue = await progressBar.getAttribute('aria-valuenow')
    await page.waitForTimeout(500)
    const updatedValue = await progressBar.getAttribute('aria-valuenow')

    const initial = parseInt(initialValue || '0')
    const updated = parseInt(updatedValue || '0')

    expect(updated).toBeGreaterThanOrEqual(initial)
  })

  test('네트워크 오류 시 재시도', async ({ page }) => {
    // 오프라인 모드 설정
    await page.context().setOffline(true)

    await page.goto('/messages/upload')

    const uploadArea = page.locator('[data-testid="file-upload"]')
    await uploadArea.locator('input[type="file"]').setInputFiles('test-image.jpg')

    // 업로드 실패 메시지 확인
    await expect(page.locator('text=네트워크 오류')).toBeVisible()

    // 온라인 복구
    await page.context().setOffline(false)

    // 재시도 버튼 클릭
    await page.click('button:has-text("재시도")')

    // 성공 확인
    await expect(page.locator('text=업로드 완료')).toBeVisible()
  })
})

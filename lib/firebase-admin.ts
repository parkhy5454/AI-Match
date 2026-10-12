/**
 * Firebase Admin SDK 초기화
 * 서버 사이드 푸시 알림 전송
 */

import * as admin from 'firebase-admin'
import { logger } from './logging'

let adminApp: admin.app.App | null = null

/**
 * Firebase Admin 초기화
 */
export function initializeFirebaseAdmin(): admin.app.App {
  if (adminApp) {
    return adminApp
  }

  try {
    // 환경 변수에서 Firebase 자격증명 로드
    const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT_KEY

    if (!serviceAccountJson) {
      throw new Error('FIREBASE_SERVICE_ACCOUNT_KEY 환경 변수가 설정되지 않았습니다')
    }

    const serviceAccount = JSON.parse(serviceAccountJson)

    adminApp = admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      projectId: process.env.FIREBASE_PROJECT_ID,
    })

    logger.info('Firebase Admin SDK 초기화 완료', {
      projectId: process.env.FIREBASE_PROJECT_ID,
    })

    return adminApp
  } catch (error) {
    logger.error('Firebase Admin 초기화 실패', {
      error: error instanceof Error ? error.message : 'Unknown error',
    })
    throw error
  }
}

/**
 * Firebase Admin 인스턴스 반환
 */
export function getFirebaseAdmin(): admin.app.App {
  if (!adminApp) {
    return initializeFirebaseAdmin()
  }
  return adminApp
}

/**
 * Messaging 서비스 반환
 */
export function getMessaging(): admin.messaging.Messaging {
  const app = getFirebaseAdmin()
  return admin.messaging(app)
}

/**
 * Firestore 인스턴스 반환
 */
export function getFirestore(): admin.firestore.Firestore {
  const app = getFirebaseAdmin()
  return admin.firestore(app)
}

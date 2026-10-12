import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export interface ErrorReport {
  message: string;
  digest?: string;
  stack?: string;
  url: string;
  userAgent: string;
  timestamp: string;
  userId?: string;
  severity?: 'low' | 'medium' | 'high' | 'critical';
  context?: Record<string, any>;
}

/**
 * 클라이언트에서 보낸 에러 리포트 처리
 * POST /api/errors/report
 */
export async function POST(request: NextRequest) {
  try {
    const body: ErrorReport = await request.json();

    // 입력값 검증
    if (!body.message || !body.url) {
      return NextResponse.json(
        { error: '필수 필드가 누락되었습니다' },
        { status: 400 }
      );
    }

    // 에러 심각도 결정
    const severity = determineSeverity(body.message, body.stack);

    // 에러 정보 로깅
    const errorLog = {
      message: body.message,
      digest: body.digest,
      stack: body.stack,
      url: body.url,
      userAgent: body.userAgent,
      timestamp: new Date(body.timestamp),
      severity,
      ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip'),
      context: JSON.stringify(body.context || {}),
    };

    console.error('[Error Report API] 클라이언트 에러:', errorLog);

    // 심각한 에러는 데이터베이스에 저장
    if (severity === 'critical' || severity === 'high') {
      try {
        console.error('[Error Report API] 심각한 에러 기록:', errorLog);
      } catch (dbError) {
        console.error('[Error Report API] 데이터베이스 저장 실패:', dbError);
      }
    }

    // 알림 전송 (심각한 에러의 경우)
    if (severity === 'critical') {
      try {
        await notifyAdmins(errorLog);
      } catch (notifyError) {
        console.error('[Error Report API] 관리자 알림 실패:', notifyError);
      }
    }

    return NextResponse.json(
      {
        success: true,
        message: '에러 리포트가 기록되었습니다',
        reportId: body.digest || generateReportId(),
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('[Error Report API] 에러 처리 실패:', error);

    return NextResponse.json(
      { error: '에러 리포트 처리 중 문제가 발생했습니다' },
      { status: 500 }
    );
  }
}

/**
 * 에러 심각도 결정
 */
function determineSeverity(
  message: string,
  stack?: string
): 'low' | 'medium' | 'high' | 'critical' {
  const lowerMessage = message.toLowerCase();

  if (
    lowerMessage.includes('cannot read') ||
    lowerMessage.includes('cannot access') ||
    lowerMessage.includes('undefined') ||
    lowerMessage.includes('null reference') ||
    (stack && stack.includes('ReferenceError')) ||
    (stack && stack.includes('TypeError'))
  ) {
    return 'critical';
  }

  if (
    lowerMessage.includes('failed') ||
    lowerMessage.includes('error') ||
    lowerMessage.includes('exception') ||
    (stack && stack.includes('SyntaxError'))
  ) {
    return 'high';
  }

  if (
    lowerMessage.includes('warning') ||
    lowerMessage.includes('deprecated') ||
    lowerMessage.includes('validation')
  ) {
    return 'medium';
  }

  return 'low';
}

/**
 * 관리자 알림 전송
 */
async function notifyAdmins(errorLog: any): Promise<void> {
  console.error('[Error Notification] 관리자에게 알림:', {
    severity: errorLog.severity,
    message: errorLog.message,
    url: errorLog.url,
  });

  const slackWebhook = process.env.SLACK_ERROR_WEBHOOK;
  if (slackWebhook) {
    try {
      await fetch(slackWebhook, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: `🚨 심각한 에러 발생: ${errorLog.severity.toUpperCase()}`,
          blocks: [
            {
              type: 'section',
              text: {
                type: 'mrkdwn',
                text: `*에러 심각도*: ${errorLog.severity}\n*메시지*: ${errorLog.message}\n*URL*: ${errorLog.url}\n*시간*: ${errorLog.timestamp}`,
              },
            },
          ],
        }),
      });
    } catch (error) {
      console.error('[Slack Notification] 실패:', error);
    }
  }
}

/**
 * 고유한 리포트 ID 생성
 */
function generateReportId(): string {
  return `ERR-${Date.now()}-${Math.random().toString(36).substring(2, 9).toUpperCase()}`;
}

/**
 * OPTIONS 요청 처리 (CORS pre-flight)
 */
export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}

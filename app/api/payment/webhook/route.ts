/**
 * Stripe 웹훅 핸들러
 * POST /api/payment/webhook
 */

import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { handlePaymentWebhook } from '@/lib/payment-system'
import { logger } from '@/lib/logging'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2024-04-10',
})

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET || ''

export async function POST(request: NextRequest) {
  try {
    const body = await request.text()
    const signature = request.headers.get('stripe-signature')

    if (!signature) {
      return NextResponse.json(
        { error: '서명이 없습니다' },
        { status: 400 }
      )
    }

    // Stripe 서명 검증
    let event: Stripe.Event
    try {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret)
    } catch (error) {
      logger.error('웹훅 서명 검증 실패', {
        error: error instanceof Error ? error.message : 'Unknown error',
      })
      return NextResponse.json(
        { error: '서명 검증 실패' },
        { status: 400 }
      )
    }

    // 웹훅 이벤트 처리
    await handlePaymentWebhook(event)

    logger.info('웹훅 처리됨', {
      eventId: event.id,
      type: event.type,
    })

    return NextResponse.json({ received: true })
  } catch (error) {
    logger.error('웹훅 처리 오류', {
      error: error instanceof Error ? error.message : 'Unknown error',
    })

    return NextResponse.json(
      { error: '웹훅 처리 실패' },
      { status: 500 }
    )
  }
}

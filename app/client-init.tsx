'use client';

import { useEffect } from 'react';
import { initSentryClient } from '@/sentry.client.config';
import { initWebVitals, useFetchMonitoring } from '@/lib/performance';

/**
 * Client-side initialization component
 * Handles Sentry, Web Vitals, and API monitoring setup
 */
export function ClientInit() {
  useEffect(() => {
    // Initialize Sentry on client side
    initSentryClient();

    // Initialize Web Vitals monitoring
    initWebVitals();

    // Enable API performance monitoring
    useFetchMonitoring();

    console.log('[App] Performance monitoring initialized');
  }, []);

  return null;
}

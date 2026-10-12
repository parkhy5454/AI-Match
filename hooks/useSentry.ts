/**
 * Custom hook for Sentry integration
 * Provides easy access to Sentry functions in React components
 */

'use client';

import { useCallback } from 'react';
import {
  captureException,
  captureMessage,
  setUserContext,
  clearUserContext,
  addBreadcrumb,
} from '@/sentry.client.config';

export function useSentry() {
  const handleException = useCallback(
    (error: Error | string, context?: Record<string, any>) => {
      captureException(error, context);
    },
    []
  );

  const handleMessage = useCallback(
    (
      message: string,
      level: 'fatal' | 'error' | 'warning' | 'info' | 'debug' = 'info',
      context?: Record<string, any>
    ) => {
      captureMessage(message, level, context);
    },
    []
  );

  const setUser = useCallback(
    (userId: string, email?: string, username?: string) => {
      setUserContext(userId, email, username);
    },
    []
  );

  const clearUser = useCallback(() => {
    clearUserContext();
  }, []);

  const trackEvent = useCallback(
    (
      eventName: string,
      category: string = 'event',
      level: 'fatal' | 'error' | 'warning' | 'info' | 'debug' = 'info',
      data?: Record<string, any>
    ) => {
      addBreadcrumb(eventName, category, level, data);
    },
    []
  );

  return {
    captureException: handleException,
    captureMessage: handleMessage,
    setUser,
    clearUser,
    trackEvent,
  };
}

/**
 * Hook to track page views and navigation
 */
export function useSentryPageTracking(pageName: string) {
  const { trackEvent } = useSentry();

  const trackPageView = useCallback(() => {
    trackEvent(`Viewed ${pageName}`, 'page-view', 'info', {
      page: pageName,
      timestamp: new Date().toISOString(),
    });
  }, [pageName, trackEvent]);

  return { trackPageView };
}

/**
 * Hook to track user interactions
 */
export function useSentryEventTracking() {
  const { trackEvent } = useSentry();

  const trackClick = useCallback(
    (elementName: string, additionalData?: Record<string, any>) => {
      trackEvent(`Clicked ${elementName}`, 'user-interaction', 'info', {
        element: elementName,
        ...additionalData,
      });
    },
    [trackEvent]
  );

  const trackFormSubmit = useCallback(
    (formName: string, additionalData?: Record<string, any>) => {
      trackEvent(`Submitted ${formName}`, 'form-submission', 'info', {
        form: formName,
        ...additionalData,
      });
    },
    [trackEvent]
  );

  const trackError = useCallback(
    (
      errorName: string,
      error: Error | string,
      additionalContext?: Record<string, any>
    ) => {
      trackEvent(`Error: ${errorName}`, 'error', 'error', {
        error: typeof error === 'string' ? error : error.message,
        ...additionalContext,
      });
    },
    [trackEvent]
  );

  return { trackClick, trackFormSubmit, trackError };
}

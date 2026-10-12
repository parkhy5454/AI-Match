import type { Metadata } from 'next';
import { ClientInit } from './client-init';
import { AuthProvider } from './auth-context';
import { SocketProvider } from './socket-context';

export const metadata: Metadata = {
  title: 'AI-Match - 완벽한 매칭 찾기',
  description: 'AI 기반 매칭 서비스',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'AI-Match',
  },
  formatDetection: {
    telephone: false,
  },
  viewport: {
    width: 'device-width',
    initialScale: 1,
    maximumScale: 1,
    userScalable: false,
    viewportFit: 'cover',
  },
  icons: {
    icon: '/favicon.ico',
    apple: '/apple-touch-icon.png',
  },
  themeColor: '#667eea',
  openGraph: {
    title: 'AI-Match - 완벽한 매칭 찾기',
    description: 'AI 기반 매칭 서비스',
    url: 'https://ai-match-qtra.onrender.com',
    type: 'website',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {

  return (
    <html lang="ko">
      <head>
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="AI-Match" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <link rel="icon" type="image/x-icon" href="/favicon.ico" />
        <meta name="theme-color" content="#667eea" media="(prefers-color-scheme: light)" />
        <meta name="theme-color" content="#667eea" media="(prefers-color-scheme: dark)" />
      </head>
      <body style={styles.body}>
        <ClientInit />
        <AuthProvider>
          <SocketProvider>
            {children}
          </SocketProvider>
        </AuthProvider>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if ('serviceWorker' in navigator) {
                navigator.serviceWorker.register('/sw.js').then((registration) => {
                  console.log('Service Worker 등록 성공:', registration);
                }).catch((error) => {
                  console.log('Service Worker 등록 실패:', error);
                });
              }

              // PWA 설치 프롬프트
              let deferredPrompt;
              window.addEventListener('beforeinstallprompt', (e) => {
                e.preventDefault();
                deferredPrompt = e;
              });
            `,
          }}
        />
      </body>
    </html>
  );
}

const styles = {
  body: {
    margin: 0,
    padding: 0,
    fontFamily: 'system-ui, -apple-system, sans-serif',
    backgroundColor: '#ffffff',
  },
};

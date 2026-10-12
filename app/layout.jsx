import './globals.css';

export const metadata = {
  title: 'AI-Match',
  description: 'Find your perfect match with AI-Match',
};

export default function RootLayout({ children }) {
  return (
    <html lang="ko">
      <head />
      <body>{children}</body>
    </html>
  );
}

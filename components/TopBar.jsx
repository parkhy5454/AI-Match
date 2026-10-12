'use client'
import { usePathname } from 'next/navigation'
const titles = {'/': 'AI-Match','/search': '검색','/ai-match': 'AI 매칭','/messages': '메시지','/profile': '프로필'}
export default function TopBar() {
  const pathname = usePathname()
  const title = titles[pathname] || 'AI-Match'
  return (
    <header className="fixed top-0 left-0 right-0 z-50 flex h-[56px] items-center justify-between border-b border-white/[0.06] bg-black/70 backdrop-blur-[20px] px-4 pt-[env(safe-area-inset-top)]">
      <h1 className="text-[17px] font-bold tracking-tight text-white">{title}</h1>
      <div className="flex items-center gap-3">
        <button className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-white/80">◍</button>
        <button className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-white/80">⚙</button>
      </div>
    </header>
  )
}

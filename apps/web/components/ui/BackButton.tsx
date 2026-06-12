'use client'

import { useRouter } from 'next/navigation'
import { ChevronLeft } from 'lucide-react'

export function BackButton({ fallback = '/' }: { fallback?: string }) {
  const router = useRouter()

  function handleBack() {
    if (window.history.length > 1) {
      router.back()
    } else {
      router.push(fallback)
    }
  }

  return (
    <button
      onClick={handleBack}
      className="text-muted-foreground hover:text-foreground transition-colors"
      aria-label="Go back"
    >
      <ChevronLeft size={18} />
    </button>
  )
}

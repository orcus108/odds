'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'

export default function BackButton() {
  const router = useRouter()
  const [label, setLabel] = useState('Back')

  useEffect(() => {
    const ref = document.referrer
    if (!ref) return
    try {
      const path = new URL(ref).pathname
      if (path === '/') {
        setLabel('Back to Markets')
      } else if (path.startsWith('/category/')) {
        const cat = decodeURIComponent(path.replace('/category/', ''))
        setLabel(`Back to ${cat}`)
      }
    } catch {
      // ignore malformed referrer
    }
  }, [])

  return (
    <button
      onClick={() => router.back()}
      className="text-sm text-zinc-500 hover:text-zinc-300 transition"
    >
      ← {label}
    </button>
  )
}

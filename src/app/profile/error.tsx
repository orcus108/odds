'use client'

import { useEffect } from 'react'
import Link from 'next/link'

export default function ProfileError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('Profile error:', error)
  }, [error])

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 text-center gap-4">
      <p className="text-zinc-300 font-medium">Failed to load profile</p>
      <p className="text-sm text-zinc-500">Something went wrong. Try refreshing.</p>
      <div className="flex gap-3">
        <button
          onClick={reset}
          className="rounded-lg px-4 py-2 text-sm font-medium text-white"
          style={{ background: 'var(--color-accent)' }}
        >
          Retry
        </button>
        <Link href="/" className="rounded-lg px-4 py-2 text-sm font-medium border border-zinc-700 text-zinc-300 hover:text-zinc-100">
          Home
        </Link>
      </div>
    </div>
  )
}

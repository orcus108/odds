'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function OnboardingPage() {
  const [username, setUsername] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const trimmed = username.trim()

    if (!/^[a-zA-Z0-9_]{3,20}$/.test(trimmed)) {
      setError('Username must be 3–20 characters: letters, numbers, underscores only')
      return
    }

    setLoading(true)
    setError('')

    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      router.push('/login')
      return
    }

    const { error: dbError } = await supabase
      .from('users')
      .update({ username: trimmed })
      .eq('id', user.id)

    if (dbError) {
      if (dbError.code === '23505') {
        setError('Username is already taken. Please choose another.')
      } else {
        setError('Something went wrong. Please try again.')
      }
      setLoading(false)
      return
    }

    router.push('/')
    router.refresh()
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center space-y-1">
          <div className="text-4xl font-black tracking-tight" style={{ color: '#f59e0b' }}>
            Odds
          </div>
          <p className="text-zinc-400 text-sm">One last thing</p>
        </div>

        <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-8 space-y-6">
          <div className="space-y-1">
            <h1 className="text-xl font-semibold text-zinc-100">Pick a username</h1>
            <p className="text-sm text-zinc-400">
              This is how others will see you on the leaderboard and in trades.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="e.g. priya_cs23"
                maxLength={20}
                className="w-full rounded-xl border border-zinc-700 bg-zinc-800 px-4 py-3 text-sm text-zinc-100 placeholder-zinc-500 outline-none focus:border-amber-500/60 transition"
                autoFocus
              />
              {error && (
                <p className="text-xs text-red-400">{error}</p>
              )}
              <p className="text-xs text-zinc-500">
                3–20 characters. Letters, numbers, underscores.
              </p>
            </div>

            <button
              type="submit"
              disabled={loading || username.trim().length < 3}
              className="w-full rounded-xl py-3 text-sm font-semibold text-zinc-900 transition disabled:opacity-40"
              style={{ background: '#f59e0b' }}
            >
              {loading ? 'Saving…' : 'Get started →'}
            </button>
          </form>

          <p className="text-xs text-zinc-500 text-center">
            You&apos;ll start with <span className="text-amber-400 font-semibold">1000 OC</span> to trade with
          </p>
        </div>
      </div>
    </div>
  )
}

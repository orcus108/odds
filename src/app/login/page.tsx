'use client'

import { createClient } from '@/lib/supabase/client'
import { useSearchParams } from 'next/navigation'
import { Suspense } from 'react'

const ERROR_MESSAGES: Record<string, string> = {
  domain: 'Odds is only for IITM students. Please sign in with your @smail.iitm.ac.in account.',
  auth_failed: 'Sign-in failed. Please try again.',
  no_email: 'Could not retrieve your email. Please try again.',
}

function LoginContent() {
  const searchParams = useSearchParams()
  const error = searchParams.get('error')
  const next = searchParams.get('next') ?? '/'
  const safeNext = next.startsWith('/') && !next.startsWith('//') ? next : '/'

  async function handleSignIn() {
    const supabase = createClient()
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(safeNext)}`,
        queryParams: {
          hd: 'smail.iitm.ac.in',
        },
      },
    })
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4">
      <div className="w-full max-w-sm space-y-8">
        {/* Logo */}
        <div className="text-center space-y-2">
          <div className="text-5xl font-black tracking-tight" style={{ color: 'var(--color-accent)' }}>
            Odds
          </div>
          <p className="text-zinc-400 text-sm">
            Prediction markets for IIT Madras
          </p>
        </div>

        {/* Error */}
        {error && (
          <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
            {ERROR_MESSAGES[error] ?? 'Something went wrong. Please try again.'}
          </div>
        )}

        {/* Sign in card */}
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-8 space-y-6">
          <div className="space-y-1">
            <h1 className="text-xl font-semibold text-zinc-100">Sign in</h1>
            <p className="text-sm text-zinc-400">
              Use your <span className="text-zinc-300">@smail.iitm.ac.in</span> Google account
            </p>
          </div>

          <button
            onClick={handleSignIn}
            className="w-full flex items-center justify-center gap-3 rounded-xl border border-zinc-700 bg-zinc-800 px-4 py-3 text-sm font-medium text-zinc-100 transition hover:bg-zinc-700 active:scale-[0.98]"
          >
            <GoogleIcon />
            Continue with Google
          </button>

          <p className="text-xs text-zinc-500 text-center">
            Only <span className="text-zinc-400">@smail.iitm.ac.in</span> emails are accepted
          </p>
        </div>

        {/* What is this */}
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-6 space-y-3">
          <p className="text-xs font-medium text-zinc-400 uppercase tracking-wide">What is Odds?</p>
          <ul className="space-y-2 text-sm text-zinc-400">
            <li className="flex items-start gap-2">
              <span style={{ color: 'var(--color-accent)' }}>→</span>
              Browse markets on campus events, placements, sports, and more
            </li>
            <li className="flex items-start gap-2">
              <span style={{ color: 'var(--color-accent)' }}>→</span>
              Trade YES or NO using free Oddcoins (OC) — no real money
            </li>
            <li className="flex items-start gap-2">
              <span style={{ color: 'var(--color-accent)' }}>→</span>
              Climb the leaderboard by being right
            </li>
          </ul>
        </div>
      </div>
    </div>
  )
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
      <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
      <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 009 18z" fill="#34A853"/>
      <path d="M3.964 10.71A5.41 5.41 0 013.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 000 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/>
      <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 00.957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
    </svg>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginContent />
    </Suspense>
  )
}

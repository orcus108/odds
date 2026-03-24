'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { User } from '@supabase/supabase-js'

interface Props {
  user: User | null
  userData: { username: string | null; balance_oc: number; is_admin: boolean } | null
}

export default function NavbarClient({ user, userData }: Props) {
  const router = useRouter()
  const [open, setOpen] = useState(false)

  async function handleSignOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  if (!user) {
    return null
  }

  return (
    <div className="flex items-center gap-3">
      <div className="hidden sm:flex items-center gap-1.5 rounded-full border border-zinc-700 bg-zinc-900 px-3 py-1 text-sm">
        <span className="text-accent font-semibold">{userData?.balance_oc?.toLocaleString() ?? '…'}</span>
        <span className="text-zinc-500">OC</span>
      </div>
      <Link
        href="/profile"
        className="hidden sm:block text-sm text-zinc-300 hover:text-zinc-100 transition font-medium"
      >
        {userData?.username ?? user.email?.split('@')[0]}
      </Link>
      <button
        onClick={handleSignOut}
        className="hidden sm:block text-xs text-zinc-500 hover:text-zinc-300 transition"
      >
        Sign out
      </button>

      {/* Mobile hamburger */}
      <div className="relative sm:hidden">
        <button
          onClick={() => setOpen(o => !o)}
          className="flex flex-col gap-1.5 p-2 text-zinc-400 hover:text-zinc-100"
          aria-label="Menu"
        >
          <span className="block w-5 h-px bg-current" />
          <span className="block w-5 h-px bg-current" />
          <span className="block w-5 h-px bg-current" />
        </button>

        {open && (
          <div className="absolute right-0 top-full mt-2 w-48 rounded-lg border border-zinc-800 bg-zinc-900 shadow-xl py-1 z-50">
            <div className="px-3 py-2 border-b border-zinc-800">
              <p className="text-sm font-medium text-zinc-200">{userData?.username ?? user.email?.split('@')[0]}</p>
              <p className="text-xs text-zinc-500">{userData?.balance_oc?.toLocaleString() ?? '…'} OC</p>
            </div>
            <Link href="/" onClick={() => setOpen(false)} className="block px-3 py-2 text-sm text-zinc-300 hover:text-zinc-100 hover:bg-zinc-800">Markets</Link>
            <Link href="/leaderboard" onClick={() => setOpen(false)} className="block px-3 py-2 text-sm text-zinc-300 hover:text-zinc-100 hover:bg-zinc-800">Leaderboard</Link>
            <Link href="/profile" onClick={() => setOpen(false)} className="block px-3 py-2 text-sm text-zinc-300 hover:text-zinc-100 hover:bg-zinc-800">Profile</Link>
            {userData?.is_admin && (
              <Link href="/admin" onClick={() => setOpen(false)} className="block px-3 py-2 text-sm text-zinc-300 hover:text-zinc-100 hover:bg-zinc-800">Admin</Link>
            )}
            <div className="border-t border-zinc-800 mt-1">
              <button onClick={handleSignOut} className="block w-full text-left px-3 py-2 text-sm text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800">Sign out</button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

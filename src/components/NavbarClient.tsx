'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { User } from '@supabase/supabase-js'

interface Props {
  user: User | null
  userData: { username: string | null; balance_oc: number; is_admin: boolean } | null
}

export default function NavbarClient({ user, userData }: Props) {
  const router = useRouter()

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
        className="text-sm text-zinc-300 hover:text-zinc-100 transition font-medium"
      >
        {userData?.username ?? user.email?.split('@')[0]}
      </Link>
      <button
        onClick={handleSignOut}
        className="text-xs text-zinc-500 hover:text-zinc-300 transition"
      >
        Sign out
      </button>
    </div>
  )
}

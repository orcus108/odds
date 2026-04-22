import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import NavbarClient from './NavbarClient'

export default async function Navbar() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  let userData = null
  if (user) {
    const { data } = await supabase
      .from('users')
      .select('username, balance_oc, is_admin')
      .eq('id', user.id)
      .single()
    userData = data
  }

  return (
    <nav className="border-b border-zinc-800 bg-zinc-950/80 backdrop-blur-sm sticky top-0 z-50">
      <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <Link href="/" className="text-xl font-bold tracking-tight" style={{ color: 'var(--color-accent)' }}>
            Odds
          </Link>
          <div className="hidden sm:flex items-center gap-4 text-sm text-zinc-400">
            <Link href="/" className="hover:text-zinc-100 transition">Markets</Link>
            <Link href="/leaderboard" className="hover:text-zinc-100 transition">Leaderboard</Link>
            {user && !userData?.is_admin && (
              <Link href="/propose" className="hover:text-zinc-100 transition">Propose</Link>
            )}
            {userData?.is_admin && (
              <Link href="/admin" className="hover:text-zinc-100 transition">Admin</Link>
            )}
          </div>
        </div>

        <NavbarClient user={user} userData={userData} />
      </div>
    </nav>
  )
}

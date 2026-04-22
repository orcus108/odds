import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import Navbar from '@/components/Navbar'
import LeaderboardClient from '@/components/LeaderboardClient'

export const revalidate = 120

export default async function LeaderboardPage() {
  const supabase = await createClient()

  const [{ data: { user } }, { data: users }] = await Promise.all([
    supabase.auth.getUser(),
    supabase
      .from('users')
      .select('id, username, balance_oc, created_at')
      .not('username', 'is', null)
      .order('balance_oc', { ascending: false })
      .limit(100),
  ])

  const { data: tradeCounts } = await supabase
    .from('trades')
    .select('user_id')

  const countMap: Record<string, number> = {}
  for (const t of tradeCounts ?? []) {
    countMap[t.user_id] = (countMap[t.user_id] ?? 0) + 1
  }

  const board = (users ?? []).map((u) => ({
    ...u,
    trades: countMap[u.id] ?? 0,
  }))

  return (
    <div className="min-h-screen">
      <Navbar />

      <main className="max-w-3xl mx-auto px-4 py-10 space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-zinc-100">Leaderboard</h1>
          <p className="text-sm text-zinc-500 mt-1">Ranked by balance or profit vs. starting 10,000 OC</p>
        </div>

        <div className="relative">
          <div className={!user ? 'blur-sm pointer-events-none select-none' : ''}>
            <LeaderboardClient board={board} currentUserId={user?.id ?? null} />
          </div>

          {!user && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center space-y-3 bg-zinc-950/80 backdrop-blur-sm border border-zinc-800 rounded-2xl px-8 py-6">
                <p className="text-zinc-100 font-semibold">Sign in to view the leaderboard</p>
                <p className="text-sm text-zinc-400">You need an @smail.iitm.ac.in account.</p>
                <Link
                  href="/login"
                  className="inline-flex items-center gap-2 rounded-lg px-5 py-2.5 text-sm font-semibold text-white transition hover:brightness-110"
                  style={{ background: 'var(--color-accent)' }}
                >
                  Sign in →
                </Link>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}

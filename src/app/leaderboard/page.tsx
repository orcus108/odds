import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import Navbar from '@/components/Navbar'

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

  // Get trade counts per user
  const { data: tradeCounts } = await supabase
    .from('trades')
    .select('user_id')

  const countMap: Record<string, number> = {}
  for (const t of tradeCounts ?? []) {
    countMap[t.user_id] = (countMap[t.user_id] ?? 0) + 1
  }

  const board = (users ?? []).map((u, i) => ({
    ...u,
    rank: i + 1,
    trades: countMap[u.id] ?? 0,
  }))

  return (
    <div className="min-h-screen">
      <Navbar />

      <main className="max-w-3xl mx-auto px-4 py-10 space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-zinc-100">Leaderboard</h1>
          <p className="text-sm text-zinc-500 mt-1">Ranked by current Oddcoin balance</p>
        </div>

        <div className="relative">
          <div className={!user ? 'blur-sm pointer-events-none select-none' : ''}>
            <div className="rounded-2xl border border-zinc-800 overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-zinc-800 bg-zinc-900/80">
                    <th className="text-left px-4 py-3 text-zinc-500 font-medium">Rank</th>
                    <th className="text-left px-4 py-3 text-zinc-500 font-medium">User</th>
                    <th className="text-right px-4 py-3 text-zinc-500 font-medium">Balance</th>
                    <th className="text-right px-4 py-3 text-zinc-500 font-medium hidden sm:table-cell">Trades</th>
                  </tr>
                </thead>
                <tbody>
                  {board.map((u) => {
                    const isMe = user?.id === u.id
                    return (
                      <tr
                        key={u.id}
                        className={`border-b border-zinc-800/50 last:border-0 ${
                          isMe ? 'bg-amber-500/5' : 'hover:bg-zinc-900/50'
                        } transition`}
                      >
                        <td className="px-4 py-3.5">
                          {u.rank <= 3 ? (
                            <span className="text-base">
                              {u.rank === 1 ? '🥇' : u.rank === 2 ? '🥈' : '🥉'}
                            </span>
                          ) : (
                            <span className="text-zinc-500">#{u.rank}</span>
                          )}
                        </td>
                        <td className="px-4 py-3.5">
                          <span className={`font-medium ${isMe ? 'text-amber-400' : 'text-zinc-200'}`}>
                            {u.username}
                          </span>
                          {isMe && (
                            <span className="ml-2 text-xs text-amber-500/70">(you)</span>
                          )}
                        </td>
                        <td className="px-4 py-3.5 text-right">
                          <span className="text-amber-400 font-semibold">
                            {u.balance_oc.toLocaleString()}
                          </span>
                          <span className="text-zinc-500 ml-1">OC</span>
                        </td>
                        <td className="px-4 py-3.5 text-right text-zinc-400 hidden sm:table-cell">
                          {u.trades}
                        </td>
                      </tr>
                    )
                  })}
                  {board.length === 0 && (
                    <tr>
                      <td colSpan={4} className="px-4 py-8 text-center text-zinc-500">
                        No users yet
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {!user && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center space-y-3 bg-zinc-950/80 backdrop-blur-sm border border-zinc-800 rounded-2xl px-8 py-6">
                <p className="text-zinc-100 font-semibold">Sign in to view the leaderboard</p>
                <p className="text-sm text-zinc-400">You need an @smail.iitm.ac.in account.</p>
                <Link
                  href="/login"
                  className="inline-flex items-center gap-2 rounded-lg px-5 py-2.5 text-sm font-semibold text-zinc-900 transition hover:brightness-110"
                  style={{ background: '#f59e0b' }}
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

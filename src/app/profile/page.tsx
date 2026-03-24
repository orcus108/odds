import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Navbar from '@/components/Navbar'
import Link from 'next/link'

export const revalidate = 30

function formatDate(d: string) {
  return new Date(d).toLocaleDateString('en-IN', {
    day: 'numeric', month: 'short', year: 'numeric',
  })
}

export default async function ProfilePage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: userData } = await supabase
    .from('users')
    .select('*')
    .eq('id', user.id)
    .single()

  if (!userData) redirect('/login')

  // Trade history with market titles
  const { data: trades } = await supabase
    .from('trades')
    .select('*, markets(id, title, status, outcome)')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(50)

  // Payout history
  const { data: payouts } = await supabase
    .from('payouts')
    .select('*, markets(title)')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(20)

  // Stats
  const totalTrades = trades?.length ?? 0
  const resolvedTrades = trades?.filter((t) => t.markets?.status === 'resolved') ?? []
  const wins = resolvedTrades.filter((t) => t.markets?.outcome === t.position).length
  const losses = resolvedTrades.length - wins
  const winRate = resolvedTrades.length > 0
    ? Math.round((wins / resolvedTrades.length) * 100)
    : null

  return (
    <div className="min-h-screen">
      <Navbar />

      <main className="max-w-3xl mx-auto px-4 py-10 space-y-8">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-zinc-100">{userData.username ?? 'Anonymous'}</h1>
            <p className="text-sm text-zinc-500 mt-0.5">Joined {formatDate(userData.created_at)}</p>
          </div>
          <div className="text-right">
            <div className="text-3xl font-black text-accent">{userData.balance_oc.toLocaleString()}</div>
            <div className="text-sm text-zinc-500">Oddcoins</div>
          </div>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-3 gap-3">
          <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-4 text-center">
            <div className="text-2xl font-bold text-zinc-100">{totalTrades}</div>
            <div className="text-xs text-zinc-500 mt-1">Trades</div>
          </div>
          <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-4 text-center">
            <div className="text-2xl font-bold text-green-400">{wins}</div>
            <div className="text-xs text-zinc-500 mt-1">Wins</div>
          </div>
          <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-4 text-center">
            <div className="text-2xl font-bold text-zinc-100">
              {winRate !== null ? `${winRate}%` : '—'}
            </div>
            <div className="text-xs text-zinc-500 mt-1">Win rate</div>
          </div>
        </div>

        {/* Trade history */}
        <div className="space-y-3">
          <h2 className="text-sm font-medium text-zinc-400 uppercase tracking-wide">Trade history</h2>

          {trades?.length === 0 ? (
            <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-6 text-center text-zinc-500 text-sm">
              No trades yet. <Link href="/" className="text-accent hover:underline">Browse markets →</Link>
            </div>
          ) : (
            <div className="rounded-2xl border border-zinc-800 overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-zinc-800 bg-zinc-900/80">
                    <th className="text-left px-4 py-3 text-zinc-500 font-medium">Market</th>
                    <th className="text-center px-3 py-3 text-zinc-500 font-medium">Side</th>
                    <th className="text-right px-4 py-3 text-zinc-500 font-medium">Amount</th>
                    <th className="text-center px-3 py-3 text-zinc-500 font-medium hidden sm:table-cell">Result</th>
                    <th className="text-right px-4 py-3 text-zinc-500 font-medium hidden sm:table-cell">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {trades?.map((trade) => {
                    const resolved = trade.markets?.status === 'resolved'
                    const won = resolved && trade.markets?.outcome === trade.position
                    const lost = resolved && trade.markets?.outcome !== trade.position

                    return (
                      <tr key={trade.id} className="border-b border-zinc-800/50 last:border-0 hover:bg-zinc-900/30 transition">
                        <td className="px-4 py-3 max-w-[180px]">
                          <Link
                            href={`/market/${trade.market_id}`}
                            className="text-zinc-300 hover:text-accent transition truncate block"
                          >
                            {trade.markets?.title ?? 'Unknown'}
                          </Link>
                        </td>
                        <td className="px-3 py-3 text-center">
                          <span
                            className={`text-xs font-bold rounded px-1.5 py-0.5 ${
                              trade.position === 'yes'
                                ? 'text-green-400 bg-green-500/10'
                                : 'text-red-400 bg-red-500/10'
                            }`}
                          >
                            {trade.position.toUpperCase()}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right text-accent font-medium">
                          {trade.amount_oc.toLocaleString()} OC
                        </td>
                        <td className="px-3 py-3 text-center hidden sm:table-cell">
                          {won && <span className="text-xs text-green-400">Won</span>}
                          {lost && <span className="text-xs text-red-400">Lost</span>}
                          {!resolved && <span className="text-xs text-zinc-500">Open</span>}
                        </td>
                        <td className="px-4 py-3 text-right text-zinc-500 hidden sm:table-cell text-xs">
                          {formatDate(trade.created_at)}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Payouts */}
        {(payouts?.length ?? 0) > 0 && (
          <div className="space-y-3">
            <h2 className="text-sm font-medium text-zinc-400 uppercase tracking-wide">Payouts received</h2>
            <div className="space-y-2">
              {payouts?.map((p) => (
                <div key={p.id} className="flex items-center justify-between rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-3 text-sm">
                  <span className="text-zinc-300 truncate max-w-[200px]">{p.markets?.title}</span>
                  <span className="text-green-400 font-semibold">+{p.amount_oc.toLocaleString()} OC</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  )
}

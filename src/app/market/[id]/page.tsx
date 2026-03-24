import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Navbar from '@/components/Navbar'
import ProbabilityBar from '@/components/ProbabilityBar'
import TradePanel from '@/components/TradePanel'
import SparklineChart from '@/components/SparklineChart'
import type { Market, TradeWithUser } from '@/lib/types'

export const revalidate = 30

const OUTCOME_BADGE: Record<string, string> = {
  yes: 'bg-green-500/10 text-green-400 border-green-500/20',
  no: 'bg-red-500/10 text-red-400 border-red-500/20',
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString('en-IN', {
    day: 'numeric', month: 'short', year: 'numeric',
  })
}

function timeAgo(d: string) {
  const diff = Date.now() - new Date(d).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}

export default async function MarketPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const [{ data: market }, { data: { user } }] = await Promise.all([
    supabase.from('markets').select('*').eq('id', id).single(),
    supabase.auth.getUser(),
  ])

  if (!market) notFound()

  const m = market as Market
  const total = m.yes_pool + m.no_pool
  const yesPct = total === 0 ? 50 : Math.round((m.yes_pool / total) * 100)

  // Fetch trades ascending for sparkline; reverse for display
  const { data: trades } = await supabase
    .from('trades')
    .select('*, users(username)')
    .eq('market_id', id)
    .order('created_at', { ascending: true })

  // User balance
  let userBalance: number | null = null
  if (user) {
    const { data: userData } = await supabase
      .from('users')
      .select('balance_oc')
      .eq('id', user.id)
      .single()
    userBalance = userData?.balance_oc ?? null
  }

  const allTrades = (trades ?? []) as TradeWithUser[]
  const activity = [...allTrades].reverse().slice(0, 20)

  // Reconstruct price history from trades
  const sparklineData: number[] = (() => {
    if (allTrades.length === 0) return []
    const yesSum = allTrades.filter(t => t.position === 'yes').reduce((s, t) => s + t.amount_oc, 0)
    const noSum = allTrades.filter(t => t.position === 'no').reduce((s, t) => s + t.amount_oc, 0)
    let yp = m.yes_pool - yesSum
    let np = m.no_pool - noSum
    const pts: number[] = []
    const snap = () => { const t = yp + np; pts.push(t > 0 ? Math.round(yp / t * 100) : 50) }
    snap()
    for (const trade of allTrades) {
      if (trade.position === 'yes') yp += trade.amount_oc
      else np += trade.amount_oc
      snap()
    }
    return pts
  })()

  return (
    <div className="min-h-screen">
      <Navbar />

      <main className="max-w-5xl mx-auto px-4 py-10">
        <div className="relative">
        <div className={`grid gap-8 lg:grid-cols-3${!user ? ' blur-sm pointer-events-none select-none' : ''}`}>
          {/* Left: Market info */}
          <div className="lg:col-span-2 space-y-6">
            {/* Header */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs text-zinc-500 border border-zinc-700 rounded-full px-2 py-0.5">
                  {m.category}
                </span>
                {m.status === 'open' && (
                  <span className="text-xs text-green-400 bg-green-500/10 border border-green-500/20 rounded-full px-2 py-0.5">
                    Open · closes {formatDate(m.closes_at)}
                  </span>
                )}
                {m.status === 'closed' && (
                  <span className="text-xs text-zinc-400 bg-zinc-800 border border-zinc-700 rounded-full px-2 py-0.5">
                    Closed
                  </span>
                )}
                {m.status === 'resolved' && m.outcome && (
                  <span className={`text-xs border rounded-full px-2 py-0.5 ${OUTCOME_BADGE[m.outcome]}`}>
                    Resolved: {m.outcome.toUpperCase()}
                  </span>
                )}
              </div>

              <h1 className="text-2xl font-bold text-zinc-100 leading-snug">
                {m.title}
              </h1>
            </div>

            {/* Probability */}
            <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5 space-y-4">
              <div className="flex items-end justify-between">
                <div>
                  <div className="text-4xl font-black text-green-400">{yesPct}%</div>
                  <div className="text-sm text-zinc-400">chance of YES</div>
                </div>
                <div className="text-right">
                  <div className="text-xl font-bold text-zinc-200">{total.toLocaleString()} OC</div>
                  <div className="text-sm text-zinc-400">total volume</div>
                </div>
              </div>
              <ProbabilityBar yesPool={m.yes_pool} noPool={m.no_pool} size="lg" />
              {sparklineData.length >= 2 && (
                <div className="pt-2">
                  <SparklineChart data={sparklineData} height={80} showLabels />
                </div>
              )}
              <div className="grid grid-cols-2 gap-3 pt-1 text-sm">
                <div className="rounded-lg bg-green-500/5 border border-green-500/10 p-3">
                  <div className="text-green-400 font-semibold">{m.yes_pool.toLocaleString()} OC</div>
                  <div className="text-zinc-500 text-xs">YES pool</div>
                </div>
                <div className="rounded-lg bg-red-500/5 border border-red-500/10 p-3">
                  <div className="text-red-400 font-semibold">{m.no_pool.toLocaleString()} OC</div>
                  <div className="text-zinc-500 text-xs">NO pool</div>
                </div>
              </div>
            </div>

            {/* Description */}
            {m.description && (
              <div className="space-y-2">
                <h2 className="text-sm font-medium text-zinc-400 uppercase tracking-wide">About</h2>
                <p className="text-zinc-300 leading-relaxed">{m.description}</p>
              </div>
            )}

            {/* Resolution criteria */}
            {m.resolution_criteria && (
              <div className="space-y-2">
                <h2 className="text-sm font-medium text-zinc-400 uppercase tracking-wide">Resolution criteria</h2>
                <p className="text-zinc-300 leading-relaxed">{m.resolution_criteria}</p>
              </div>
            )}

            {/* Activity feed */}
            <div className="space-y-3">
              <h2 className="text-sm font-medium text-zinc-400 uppercase tracking-wide">Recent trades</h2>
              {activity.length === 0 ? (
                <p className="text-zinc-500 text-sm">No trades yet. Be the first!</p>
              ) : (
                <div className="space-y-2">
                  {activity.map((trade) => (
                    <div
                      key={trade.id}
                      className="flex items-center justify-between text-sm py-2 border-b border-zinc-800"
                    >
                      <div className="flex items-center gap-2">
                        <span
                          className={`text-xs font-bold rounded px-1.5 py-0.5 ${
                            trade.position === 'yes'
                              ? 'text-green-400 bg-green-500/10'
                              : 'text-red-400 bg-red-500/10'
                          }`}
                        >
                          {trade.position.toUpperCase()}
                        </span>
                        <span className="text-zinc-300">
                          {trade.users?.username ?? 'Anonymous'}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 text-zinc-500">
                        <span className="text-accent">{trade.amount_oc.toLocaleString()} OC</span>
                        <span className="text-xs">{timeAgo(trade.created_at)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Right: Trade panel */}
          <div className="lg:sticky lg:top-20 h-fit">
            <TradePanel
              market={m}
              userBalance={userBalance}
              isAuthenticated={!!user}
            />
          </div>
        </div>

        {!user && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center space-y-3 bg-zinc-950/80 backdrop-blur-sm border border-zinc-800 rounded-2xl px-8 py-6">
              <p className="text-zinc-100 font-semibold">Sign in to view this market</p>
              <p className="text-sm text-zinc-400">You need an @smail.iitm.ac.in account to trade.</p>
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

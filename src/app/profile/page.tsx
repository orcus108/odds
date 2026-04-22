import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Navbar from '@/components/Navbar'
import Link from 'next/link'
import { withdrawProposal } from '@/actions/market'

export const revalidate = 0

const STARTING_BALANCE = 10000

export default async function ProfilePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  type TradeRow = {
    id: string
    market_id: string
    position: string
    amount_oc: number
    created_at: string
    markets: {
      id: string
      title: string
      status: string
      outcome: string | null
      yes_pool: number
      no_pool: number
      market_type: string
    } | null
  }
  type PayoutRow = { id: string; amount_oc: number; created_at: string; markets: { title: string } | null }
  type OptionRow = { id: string; label: string }
  type ProposalRow = { id: string; title: string; market_type: string; category: string; created_at: string }
  type ApprovedRow = { id: string; title: string; status: string; market_type: string; category: string; created_at: string }

  const [{ data: userData }, { data: rawTrades }, { data: rawPayouts }, { data: rawProposals }, { data: rawApproved }] = await Promise.all([
    supabase.from('users').select('username, balance_oc, created_at').eq('id', user.id).single(),
    supabase
      .from('trades')
      .select('id, market_id, position, amount_oc, created_at, markets(id, title, status, outcome, yes_pool, no_pool, market_type)')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(100),
    supabase.from('payouts').select('id, amount_oc, created_at, markets(title)').eq('user_id', user.id).order('created_at', { ascending: false }).limit(20),
    supabase.from('markets').select('id, title, market_type, category, created_at').eq('created_by', user.id).eq('status', 'pending').order('created_at', { ascending: false }),
    supabase.from('markets').select('id, title, status, market_type, category, created_at').eq('created_by', user.id).neq('status', 'pending').order('created_at', { ascending: false }).limit(20),
  ])

  const trades = rawTrades as unknown as TradeRow[] | null
  const payouts = rawPayouts as unknown as PayoutRow[] | null
  const proposals = rawProposals as unknown as ProposalRow[] | null
  const approved = rawApproved as unknown as ApprovedRow[] | null

  // Collect option labels for multi-choice trades
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  const optionIds = [...new Set((trades ?? []).map(t => t.position).filter(p => uuidRegex.test(p)))]
  let optionLabels: Record<string, string> = {}
  if (optionIds.length > 0) {
    const { data: options } = await supabase.from('market_options').select('id, label').in('id', optionIds)
    for (const o of (options as OptionRow[] | null) ?? []) optionLabels[o.id] = o.label
  }

  if (!userData) redirect('/login')

  // --- Computed stats ---

  const netProfit = userData.balance_oc - STARTING_BALANCE

  const resolvedTrades = (trades ?? []).filter(t => t.markets?.status === 'resolved')
  const wonTrades = resolvedTrades.filter(t => t.markets?.outcome === t.position)
  const winRate = resolvedTrades.length > 0 ? Math.round(wonTrades.length / resolvedTrades.length * 100) : null

  const bestPayout = payouts && payouts.length > 0 ? Math.max(...payouts.map(p => p.amount_oc)) : null

  // --- Open positions: group trades in open markets by market ---
  type OpenPosition = {
    marketId: string
    marketTitle: string
    bets: Record<string, number>  // position → total OC bet
    yesPct: number | null          // null for multi markets
    marketType: string
  }

  const openPosMap: Record<string, OpenPosition> = {}
  for (const trade of trades ?? []) {
    const mkt = trade.markets
    if (!mkt || mkt.status !== 'open') continue
    if (!openPosMap[mkt.id]) {
      const binaryTotal = mkt.yes_pool + mkt.no_pool
      openPosMap[mkt.id] = {
        marketId: mkt.id,
        marketTitle: mkt.title,
        bets: {},
        yesPct: mkt.market_type === 'multi' ? null : (binaryTotal === 0 ? 50 : Math.round(mkt.yes_pool / binaryTotal * 100)),
        marketType: mkt.market_type,
      }
    }
    const pos = trade.position
    openPosMap[mkt.id].bets[pos] = (openPosMap[mkt.id].bets[pos] ?? 0) + trade.amount_oc
  }
  const openPositions = Object.values(openPosMap)

  return (
    <div className="min-h-screen">
      <Navbar />
      <main className="max-w-lg mx-auto px-4 py-8 space-y-8">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-zinc-100">{userData.username}</h1>
            <p className="text-sm text-zinc-500 mt-0.5">
              {new Date(userData.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
            </p>
          </div>
          <div className="text-right">
            <div className="text-2xl font-black text-accent">{userData.balance_oc.toLocaleString()}</div>
            <div className="text-xs text-zinc-500">OC balance</div>
          </div>
        </div>

        {/* Stats bar */}
        <div className="grid grid-cols-3 gap-3">
          <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-3 text-center">
            <div className={`text-lg font-bold ${netProfit >= 0 ? 'text-green-400' : 'text-red-400'}`}>
              {netProfit >= 0 ? '+' : ''}{netProfit.toLocaleString()}
            </div>
            <div className="text-xs text-zinc-500 mt-0.5">net profit</div>
          </div>
          <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-3 text-center">
            {winRate !== null ? (
              <>
                <div className="text-lg font-bold text-zinc-100">{winRate}%</div>
                <div className="text-xs text-zinc-500 mt-0.5">win rate</div>
              </>
            ) : (
              <>
                <div className="text-lg font-bold text-zinc-600">—</div>
                <div className="text-xs text-zinc-500 mt-0.5">win rate</div>
              </>
            )}
          </div>
          <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-3 text-center">
            {bestPayout !== null ? (
              <>
                <div className="text-lg font-bold text-accent">{bestPayout.toLocaleString()}</div>
                <div className="text-xs text-zinc-500 mt-0.5">best payout</div>
              </>
            ) : (
              <>
                <div className="text-lg font-bold text-zinc-600">—</div>
                <div className="text-xs text-zinc-500 mt-0.5">best payout</div>
              </>
            )}
          </div>
        </div>

        {/* Open positions */}
        {openPositions.length > 0 && (
          <section className="space-y-3">
            <h2 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Open positions</h2>
            <div className="space-y-2">
              {openPositions.map((pos) => {
                const entries = Object.entries(pos.bets)
                return (
                  <Link
                    key={pos.marketId}
                    href={`/market/${pos.marketId}`}
                    className="flex items-center gap-3 rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-3 hover:border-zinc-700 transition"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-zinc-200 truncate">{pos.marketTitle}</p>
                      <div className="flex items-center gap-2 mt-1">
                        {entries.map(([p, amt]) => (
                          <span
                            key={p}
                            className={`text-xs font-bold px-1.5 py-0.5 rounded ${
                              p === 'yes' ? 'text-green-400 bg-green-500/10'
                              : p === 'no' ? 'text-red-400 bg-red-500/10'
                              : 'text-zinc-300 bg-zinc-700/50'
                            }`}
                          >
                            {uuidRegex.test(p) ? (optionLabels[p] ?? p.slice(0, 8)) : p.toUpperCase()}
                            {' · '}{amt.toLocaleString()} OC
                          </span>
                        ))}
                      </div>
                    </div>
                    {pos.yesPct !== null && (
                      <div className="text-right shrink-0">
                        <div className="text-sm font-bold text-green-400">{pos.yesPct}%</div>
                        <div className="text-xs text-zinc-500">YES now</div>
                      </div>
                    )}
                  </Link>
                )
              })}
            </div>
          </section>
        )}

        {/* My proposals (pending + live) */}
        {((proposals?.length ?? 0) > 0 || (approved?.length ?? 0) > 0) && (
          <section className="space-y-3">
            <h2 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">My proposals</h2>
            <div className="space-y-2">
              {/* Live / approved proposals */}
              {approved?.map((p) => (
                <Link
                  key={p.id}
                  href={`/market/${p.id}`}
                  className="flex items-center gap-3 rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-3 hover:border-zinc-700 transition"
                >
                  <span className={`text-xs font-semibold border rounded-full px-2 py-0.5 shrink-0 ${
                    p.status === 'open'
                      ? 'text-green-400 bg-green-500/10 border-green-500/20'
                      : p.status === 'resolved'
                      ? 'text-accent bg-accent/10 border-accent/20'
                      : 'text-zinc-400 bg-zinc-800 border-zinc-700'
                  }`}>
                    {p.status === 'open' ? 'live' : p.status}
                  </span>
                  <span className="flex-1 text-sm text-zinc-300 truncate">{p.title}</span>
                  <span className="text-xs text-zinc-500 shrink-0">{p.category}</span>
                </Link>
              ))}

              {/* Pending proposals */}
              {proposals?.map((p) => {
                const withdrawAction = withdrawProposal.bind(null, p.id)
                return (
                  <div key={p.id} className="flex items-center gap-3 rounded-xl border border-yellow-500/20 bg-zinc-900 px-4 py-3">
                    <span className="text-xs text-yellow-400 bg-yellow-500/10 border border-yellow-500/20 rounded-full px-2 py-0.5 shrink-0">
                      pending
                    </span>
                    <span className="flex-1 text-sm text-zinc-300 truncate">{p.title}</span>
                    <span className="text-xs text-zinc-500 shrink-0">{p.category}</span>
                    <form action={withdrawAction}>
                      <button
                        type="submit"
                        className="text-xs text-zinc-600 hover:text-red-400 transition shrink-0"
                        onClick={(e) => {
                          if (!confirm('Withdraw this proposal?')) e.preventDefault()
                        }}
                      >
                        Withdraw
                      </button>
                    </form>
                  </div>
                )
              })}
            </div>
          </section>
        )}

        {/* Trades */}
        <section className="space-y-3">
          <h2 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Trade history</h2>
          {!trades?.length ? (
            <p className="text-sm text-zinc-500">No trades yet. <Link href="/" className="text-accent">Browse markets →</Link></p>
          ) : (
            <div className="space-y-2">
              {trades.map((t) => {
                const resolved = t.markets?.status === 'resolved'
                const won = resolved && t.markets?.outcome === t.position
                const lost = resolved && t.markets?.outcome !== t.position
                return (
                  <div key={t.id} className="flex items-center gap-3 rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-3">
                    <span className={`text-xs font-bold px-1.5 py-0.5 rounded ${t.position === 'yes' ? 'text-green-400 bg-green-500/10' : t.position === 'no' ? 'text-red-400 bg-red-500/10' : 'text-zinc-300 bg-zinc-700/50'}`}>
                      {uuidRegex.test(t.position) ? (optionLabels[t.position] ?? t.position.slice(0, 8)) : t.position.toUpperCase()}
                    </span>
                    <Link href={`/market/${t.markets?.id ?? ''}`} className="flex-1 text-sm text-zinc-300 truncate hover:text-zinc-100">
                      {t.markets?.title ?? 'Unknown market'}
                    </Link>
                    <span className="text-sm text-accent font-medium shrink-0">{t.amount_oc.toLocaleString()} OC</span>
                    {won && <span className="text-xs text-green-400 shrink-0">Won</span>}
                    {lost && <span className="text-xs text-red-400 shrink-0">Lost</span>}
                  </div>
                )
              })}
            </div>
          )}
        </section>

        {/* Payouts */}
        {(payouts?.length ?? 0) > 0 && (
          <section className="space-y-3">
            <h2 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Payouts received</h2>
            <div className="space-y-2">
              {payouts!.map((p) => (
                <div key={p.id} className="flex items-center justify-between rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-3">
                  <span className="text-sm text-zinc-300 truncate">{p.markets?.title}</span>
                  <span className="text-sm text-green-400 font-semibold shrink-0 ml-3">+{p.amount_oc.toLocaleString()} OC</span>
                </div>
              ))}
            </div>
          </section>
        )}

      </main>
    </div>
  )
}

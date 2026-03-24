import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Navbar from '@/components/Navbar'
import Link from 'next/link'

export const revalidate = 0

export default async function ProfilePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  type TradeRow = { id: string; position: string; amount_oc: number; created_at: string; markets: { id: string; title: string; status: string; outcome: string | null } | null }
  type PayoutRow = { id: string; amount_oc: number; created_at: string; markets: { title: string } | null }
  type OptionRow = { id: string; label: string }

  const [{ data: userData }, { data: rawTrades }, { data: rawPayouts }] = await Promise.all([
    supabase.from('users').select('username, balance_oc, created_at').eq('id', user.id).single(),
    supabase.from('trades').select('id, position, amount_oc, created_at, markets(id, title, status, outcome)').eq('user_id', user.id).order('created_at', { ascending: false }).limit(50),
    supabase.from('payouts').select('id, amount_oc, created_at, markets(title)').eq('user_id', user.id).order('created_at', { ascending: false }).limit(20),
  ])

  const trades = rawTrades as unknown as TradeRow[] | null

  // Collect all unique option IDs (UUIDs) from multi-choice trades
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  const optionIds = [...new Set((trades ?? []).map(t => t.position).filter(p => uuidRegex.test(p)))]
  let optionLabels: Record<string, string> = {}
  if (optionIds.length > 0) {
    const { data: options } = await supabase.from('market_options').select('id, label').in('id', optionIds)
    for (const o of (options as OptionRow[] | null) ?? []) optionLabels[o.id] = o.label
  }

  const payouts = rawPayouts as unknown as PayoutRow[] | null

  if (!userData) redirect('/login')

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
            <div className="text-xs text-zinc-500">OC</div>
          </div>
        </div>

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

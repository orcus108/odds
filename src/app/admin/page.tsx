import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import Navbar from '@/components/Navbar'
import AdminActions from './AdminActions'
import ProposalActions from './ProposalActions'
import type { Market, MarketOption } from '@/lib/types'

export const revalidate = 0

function formatDate(d: string) {
  return new Date(d).toLocaleDateString('en-IN', {
    day: 'numeric', month: 'short', year: 'numeric',
  })
}

export default async function AdminPage() {
  const supabase = await createClient()

  const { data: markets } = await supabase
    .from('markets')
    .select('*')
    .neq('status', 'pending')
    .order('closes_at', { ascending: true })

  const allMarkets = (markets ?? []) as Market[]

  // Fetch pending proposals with proposer info
  const { data: pendingMarkets } = await supabase
    .from('markets')
    .select('*')
    .eq('status', 'pending')
    .order('created_at', { ascending: true })

  const proposals = (pendingMarkets ?? []) as Market[]

  const proposerIds = [...new Set(proposals.map(m => m.created_by).filter(Boolean))] as string[]
  const proposerMap: Record<string, string | null> = {}
  if (proposerIds.length > 0) {
    const { data: proposers } = await supabase
      .from('users')
      .select('id, username')
      .in('id', proposerIds)
    for (const p of proposers ?? []) proposerMap[p.id] = p.username
  }

  // Fetch options for all multi markets in one query (proposals + live)
  const allIds = [...allMarkets, ...proposals].filter(m => m.market_type === 'multi').map(m => m.id)
  const optionsByMarket: Record<string, MarketOption[]> = {}
  if (allIds.length > 0) {
    const { data: allOptions } = await supabase
      .from('market_options')
      .select('*')
      .in('market_id', allIds)
      .order('ord', { ascending: true })
    for (const opt of allOptions ?? []) {
      if (!optionsByMarket[opt.market_id]) optionsByMarket[opt.market_id] = []
      optionsByMarket[opt.market_id].push(opt as MarketOption)
    }
  }

  return (
    <div className="min-h-screen">
      <Navbar />

      <main className="max-w-5xl mx-auto px-4 py-10 space-y-10">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-zinc-100">Admin Dashboard</h1>
            <p className="text-sm text-zinc-500 mt-1">{allMarkets.length} markets total</p>
          </div>
          <Link
            href="/admin/create"
            className="rounded-xl px-5 py-2.5 text-sm font-semibold text-white transition hover:brightness-110"
            style={{ background: 'var(--color-accent)' }}
          >
            + New market
          </Link>
        </div>

        {/* Pending proposals */}
        {proposals.length > 0 && (
          <section className="space-y-3">
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider">Proposals</h2>
              <span className="rounded-full bg-yellow-500/20 border border-yellow-500/30 text-yellow-400 text-xs px-2 py-0.5">
                {proposals.length}
              </span>
            </div>
            {proposals.map((market) => {
              const options = optionsByMarket[market.id]
              return (
                <div
                  key={market.id}
                  className="rounded-2xl border border-yellow-500/20 bg-zinc-900 p-5 space-y-3"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-1 flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs border rounded-full px-2 py-0.5 text-yellow-400 bg-yellow-500/10 border-yellow-500/20">
                          pending review
                        </span>
                        {market.market_type === 'multi' && (
                          <span className="text-xs border border-zinc-700 rounded-full px-2 py-0.5 text-zinc-400">
                            multi-choice
                          </span>
                        )}
                        <span className="text-xs text-zinc-500">{market.category}</span>
                      </div>
                      <p className="font-medium text-zinc-100">{market.title}</p>
                      {market.description && (
                        <p className="text-xs text-zinc-500 line-clamp-2">{market.description}</p>
                      )}
                    </div>
                    <div className="text-right shrink-0 text-xs text-zinc-500">
                      Closes {formatDate(market.closes_at)}
                    </div>
                  </div>

                  <ProposalActions
                    market={market}
                    options={options}
                    proposerUsername={market.created_by ? proposerMap[market.created_by] : null}
                  />
                </div>
              )
            })}
          </section>
        )}

        {/* Live markets */}
        <section className="space-y-3">
          {proposals.length > 0 && (
            <h2 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider">Markets</h2>
          )}
          {allMarkets.length === 0 ? (
            <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-8 text-center text-zinc-400">
              No markets yet. Create one!
            </div>
          ) : (
            allMarkets.map((market) => {
              const options = optionsByMarket[market.id]
              const totalVolume = market.market_type === 'multi'
                ? (options ?? []).reduce((s, o) => s + o.pool, 0)
                : market.yes_pool + market.no_pool

              return (
                <div
                  key={market.id}
                  className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5 space-y-3"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-1 flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`text-xs border rounded-full px-2 py-0.5 ${
                          market.status === 'open'
                            ? 'text-green-400 bg-green-500/10 border-green-500/20'
                            : market.status === 'closed'
                            ? 'text-zinc-400 bg-zinc-800 border-zinc-700'
                            : 'text-accent bg-accent/10 border-accent/20'
                        }`}>
                          {market.status}
                          {market.status === 'resolved' && market.market_type === 'binary' && market.outcome
                            ? ` · ${market.outcome.toUpperCase()}`
                            : ''}
                        </span>
                        {market.market_type === 'multi' && (
                          <span className="text-xs border border-zinc-700 rounded-full px-2 py-0.5 text-zinc-400">
                            multi-choice
                          </span>
                        )}
                        <span className="text-xs text-zinc-500">{market.category}</span>
                      </div>
                      <Link
                        href={`/market/${market.id}`}
                        className="font-medium text-zinc-100 hover:text-accent transition"
                      >
                        {market.title}
                      </Link>
                    </div>
                    <div className="text-right shrink-0 text-sm">
                      <div className="text-accent font-semibold">
                        {totalVolume.toLocaleString()} OC
                      </div>
                      <div className="text-zinc-500 text-xs">Closes {formatDate(market.closes_at)}</div>
                    </div>
                  </div>

                  <AdminActions market={market} options={options} />
                </div>
              )
            })
          )}
        </section>
      </main>
    </div>
  )
}

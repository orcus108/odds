import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import Navbar from '@/components/Navbar'
import AdminActions from './AdminActions'
import ProposalActions from './ProposalActions'
import type { Market, MarketOption } from '@/lib/types'

export const revalidate = 0

const VALID_TABS = ['proposals', 'active', 'closed', 'resolved'] as const
type Tab = typeof VALID_TABS[number]

function formatDate(d: string) {
  return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
}

// ---- Sub-components ----

function TabButton({ href, active, count, urgency, children }: {
  href: string
  active: boolean
  count: number
  urgency: 'yellow' | 'orange' | 'green' | 'none'
  children: React.ReactNode
}) {
  const activeUnderline = {
    yellow: 'border-yellow-500 text-yellow-400',
    orange: 'border-orange-500 text-orange-400',
    green: 'border-green-500 text-green-400',
    none: 'border-zinc-400 text-zinc-200',
  }
  const activeBadge = {
    yellow: 'bg-yellow-500/20 text-yellow-400',
    orange: 'bg-orange-500/20 text-orange-400',
    green: 'bg-green-500/20 text-green-400',
    none: 'bg-zinc-700 text-zinc-400',
  }
  return (
    <Link
      href={href}
      className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
        active
          ? activeUnderline[urgency]
          : 'border-transparent text-zinc-500 hover:text-zinc-300'
      }`}
    >
      {children}
      {count > 0 && (
        <span className={`rounded-full px-1.5 py-0.5 text-xs font-semibold leading-none ${
          active ? activeBadge[urgency] : 'bg-zinc-800 text-zinc-500'
        }`}>
          {count}
        </span>
      )}
    </Link>
  )
}

function EmptyState({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-900/30 p-12 text-center space-y-2">
      <p className="text-zinc-300 font-medium">{title}</p>
      <p className="text-sm text-zinc-500">{body}</p>
    </div>
  )
}

function MarketRow({ market, options, totalVolume, pastDue }: {
  market: Market
  options?: MarketOption[]
  totalVolume: number
  pastDue: boolean
}) {
  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5 space-y-3">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1 flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`text-xs border rounded-full px-2 py-0.5 ${
              market.status === 'open'
                ? 'text-green-400 bg-green-500/10 border-green-500/20'
                : 'text-zinc-400 bg-zinc-800 border-zinc-700'
            }`}>
              {market.status}
            </span>
            {pastDue && (
              <span className="text-xs text-orange-400 bg-orange-500/10 border border-orange-500/20 rounded-full px-2 py-0.5">
                past due
              </span>
            )}
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
          <div className="text-accent font-semibold">{totalVolume.toLocaleString()} OC</div>
          <div className="text-zinc-500 text-xs">Closes {formatDate(market.closes_at)}</div>
        </div>
      </div>
      <AdminActions market={market} options={options} />
    </div>
  )
}

// ---- Page ----

export default async function AdminPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>
}) {
  const supabase = await createClient()
  const { tab: tabParam } = await searchParams

  const [{ data: markets }, { data: pendingMarkets }] = await Promise.all([
    supabase.from('markets').select('*').neq('status', 'pending').order('closes_at', { ascending: true }),
    supabase.from('markets').select('*').eq('status', 'pending').order('created_at', { ascending: true }),
  ])

  const allMarkets = (markets ?? []) as Market[]
  const proposals = (pendingMarkets ?? []) as Market[]

  // Proposer usernames
  const proposerIds = [...new Set(proposals.map(m => m.created_by).filter(Boolean))] as string[]
  const proposerMap: Record<string, string | null> = {}
  if (proposerIds.length > 0) {
    const { data: proposers } = await supabase.from('users').select('id, username').in('id', proposerIds)
    for (const p of proposers ?? []) proposerMap[p.id] = p.username
  }

  // Options for multi markets
  const allIds = [...allMarkets, ...proposals].filter(m => m.market_type === 'multi').map(m => m.id)
  const optionsByMarket: Record<string, MarketOption[]> = {}
  if (allIds.length > 0) {
    const { data: allOptions } = await supabase
      .from('market_options').select('*').in('market_id', allIds).order('ord', { ascending: true })
    for (const opt of allOptions ?? []) {
      if (!optionsByMarket[opt.market_id]) optionsByMarket[opt.market_id] = []
      optionsByMarket[opt.market_id].push(opt as MarketOption)
    }
  }

  const openMarkets = allMarkets.filter(m => m.status === 'open')
  const closedMarkets = allMarkets.filter(m => m.status === 'closed')
  const resolvedMarkets = allMarkets.filter(m => m.status === 'resolved')

  const counts = {
    proposals: proposals.length,
    active: openMarkets.length,
    closed: closedMarkets.length,
    resolved: resolvedMarkets.length,
  }

  const defaultTab: Tab = proposals.length > 0 ? 'proposals' : 'active'
  const tab: Tab = (tabParam && VALID_TABS.includes(tabParam as Tab)) ? tabParam as Tab : defaultTab

  return (
    <div className="min-h-screen">
      <Navbar />
      <main className="max-w-5xl mx-auto px-4 py-10 space-y-6">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-zinc-100">Admin Dashboard</h1>
            <p className="text-sm text-zinc-500 mt-1">
              {allMarkets.length} markets
              {proposals.length > 0 && (
                <span className="text-yellow-400 ml-2">· {proposals.length} pending proposal{proposals.length !== 1 ? 's' : ''}</span>
              )}
            </p>
          </div>
          <Link
            href="/admin/create"
            className="rounded-xl px-5 py-2.5 text-sm font-semibold text-white transition hover:brightness-110"
            style={{ background: 'var(--color-accent)' }}
          >
            + New market
          </Link>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-0 border-b border-zinc-800 -mb-2">
          <TabButton href="?tab=proposals" active={tab === 'proposals'} count={counts.proposals} urgency="yellow">
            Proposals
          </TabButton>
          <TabButton href="?tab=active" active={tab === 'active'} count={counts.active} urgency="green">
            Active
          </TabButton>
          <TabButton href="?tab=closed" active={tab === 'closed'} count={counts.closed} urgency="orange">
            Needs resolution
          </TabButton>
          <TabButton href="?tab=resolved" active={tab === 'resolved'} count={counts.resolved} urgency="none">
            Resolved
          </TabButton>
        </div>

        {/* Proposals tab */}
        {tab === 'proposals' && (
          proposals.length === 0 ? (
            <EmptyState
              title="No pending proposals"
              body="When users submit market proposals, they'll appear here for review."
            />
          ) : (
            <div className="space-y-4 pt-2">
              {proposals.map((market) => {
                const options = optionsByMarket[market.id]
                const pastDue = new Date(market.closes_at) < new Date()
                return (
                  <div key={market.id} className="rounded-2xl border border-yellow-500/20 bg-zinc-900 p-5 space-y-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="space-y-2 flex-1 min-w-0">
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
                        <p className="font-semibold text-zinc-100">{market.title}</p>
                        {market.description && (
                          <p className="text-sm text-zinc-400 leading-relaxed">{market.description}</p>
                        )}
                        {market.resolution_criteria && (
                          <p className="text-xs text-zinc-500 border-l-2 border-zinc-700 pl-3 leading-relaxed italic">
                            {market.resolution_criteria}
                          </p>
                        )}
                      </div>
                      <div className="text-right shrink-0 text-xs text-zinc-500 space-y-1">
                        <div>Closes {formatDate(market.closes_at)}</div>
                        {pastDue && <div className="text-orange-400 font-medium">Past due</div>}
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
            </div>
          )
        )}

        {/* Active tab */}
        {tab === 'active' && (
          openMarkets.length === 0 ? (
            <EmptyState title="No active markets" body="Create a market or approve a proposal to get started." />
          ) : (
            <div className="space-y-3 pt-2">
              {openMarkets.map((market) => {
                const options = optionsByMarket[market.id]
                const totalVolume = market.market_type === 'multi'
                  ? (options ?? []).reduce((s, o) => s + o.pool, 0)
                  : market.yes_pool + market.no_pool
                return (
                  <MarketRow
                    key={market.id}
                    market={market}
                    options={options}
                    totalVolume={totalVolume}
                    pastDue={new Date(market.closes_at) < new Date()}
                  />
                )
              })}
            </div>
          )
        )}

        {/* Needs resolution tab */}
        {tab === 'closed' && (
          closedMarkets.length === 0 ? (
            <EmptyState title="Nothing to resolve" body="Markets closed for trading but not yet resolved will appear here." />
          ) : (
            <div className="space-y-3 pt-2">
              {closedMarkets.map((market) => {
                const options = optionsByMarket[market.id]
                const totalVolume = market.market_type === 'multi'
                  ? (options ?? []).reduce((s, o) => s + o.pool, 0)
                  : market.yes_pool + market.no_pool
                return (
                  <MarketRow
                    key={market.id}
                    market={market}
                    options={options}
                    totalVolume={totalVolume}
                    pastDue={false}
                  />
                )
              })}
            </div>
          )
        )}

        {/* Resolved tab — compact table */}
        {tab === 'resolved' && (
          resolvedMarkets.length === 0 ? (
            <EmptyState title="No resolved markets yet" body="Resolved markets will be archived here." />
          ) : (
            <div className="rounded-2xl border border-zinc-800 overflow-hidden pt-2">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-zinc-800 bg-zinc-900/80">
                    <th className="text-left px-4 py-3 text-zinc-500 font-medium">Market</th>
                    <th className="text-left px-4 py-3 text-zinc-500 font-medium hidden sm:table-cell">Category</th>
                    <th className="text-right px-4 py-3 text-zinc-500 font-medium">Outcome</th>
                    <th className="text-right px-4 py-3 text-zinc-500 font-medium hidden sm:table-cell">Volume</th>
                    <th className="text-right px-4 py-3 text-zinc-500 font-medium hidden md:table-cell">Closed</th>
                  </tr>
                </thead>
                <tbody>
                  {resolvedMarkets.map((market) => {
                    const options = optionsByMarket[market.id]
                    const isMulti = market.market_type === 'multi'
                    const totalVolume = isMulti
                      ? (options ?? []).reduce((s, o) => s + o.pool, 0)
                      : market.yes_pool + market.no_pool
                    const outcomeLabel = isMulti
                      ? (options?.find(o => o.id === market.outcome)?.label ?? market.outcome ?? '—')
                      : (market.outcome?.toUpperCase() ?? '—')
                    return (
                      <tr key={market.id} className="border-b border-zinc-800/50 last:border-0 hover:bg-zinc-900/40 transition">
                        <td className="px-4 py-3">
                          <Link href={`/market/${market.id}`} className="text-zinc-300 hover:text-zinc-100 transition line-clamp-1">
                            {market.title}
                          </Link>
                        </td>
                        <td className="px-4 py-3 text-zinc-500 hidden sm:table-cell">{market.category}</td>
                        <td className="px-4 py-3 text-right">
                          <span className={`text-xs font-semibold ${
                            market.outcome === 'yes' ? 'text-green-400'
                            : market.outcome === 'no' ? 'text-red-400'
                            : 'text-accent'
                          }`}>
                            {outcomeLabel}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right text-zinc-400 hidden sm:table-cell">
                          {totalVolume.toLocaleString()} OC
                        </td>
                        <td className="px-4 py-3 text-right text-zinc-500 hidden md:table-cell">
                          {formatDate(market.closes_at)}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )
        )}

      </main>
    </div>
  )
}

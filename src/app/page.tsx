import { createClient } from '@/lib/supabase/server'
import Navbar from '@/components/Navbar'
import MarketCard from '@/components/MarketCard'
import MarketsSortableGrid from '@/components/MarketsSortableGrid'
import type { Market, MarketOption } from '@/lib/types'
import Link from 'next/link'

export const revalidate = 60

const STANDARD_CATEGORIES = ['Acads', 'Insti Life', 'Sports']

export default async function HomePage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { data: markets } = await supabase
    .from('markets')
    .select('*')
    .eq('status', 'open')
    .order('created_at', { ascending: false })

  const openMarkets = (markets ?? []) as Market[]

  // Split into standard markets and special category collections (e.g. IPL)
  const standardMarkets = openMarkets.filter(m => STANDARD_CATEGORIES.includes(m.category))
  const specialCategories = [...new Set(
    openMarkets.filter(m => !STANDARD_CATEGORIES.includes(m.category)).map(m => m.category)
  )]

  // Fetch options for multi markets
  const multiIds = openMarkets.filter(m => m.market_type === 'multi').map(m => m.id)
  const optionsByMarket: Record<string, MarketOption[]> = {}
  if (multiIds.length > 0) {
    const { data: allOptions } = await supabase
      .from('market_options')
      .select('*')
      .in('market_id', multiIds)
      .order('ord', { ascending: true })
    for (const opt of allOptions ?? []) {
      if (!optionsByMarket[opt.market_id]) optionsByMarket[opt.market_id] = []
      optionsByMarket[opt.market_id].push(opt as MarketOption)
    }
  }

  // Batch fetch trades for standard binary markets to build sparklines
  const sparklines: Record<string, number[]> = {}
  const binaryStandardMarkets = standardMarkets.filter(m => m.market_type !== 'multi')
  if (binaryStandardMarkets.length > 0) {
    const ids = binaryStandardMarkets.map(m => m.id)
    const { data: allTrades } = await supabase
      .from('trades')
      .select('market_id, position, amount_oc')
      .in('market_id', ids)
      .order('created_at', { ascending: true })
    if (allTrades) {
      for (const m of standardMarkets) {
        const mTrades = allTrades.filter(t => t.market_id === m.id)
        if (mTrades.length === 0) continue
        const yesSum = mTrades.filter(t => t.position === 'yes').reduce((s, t) => s + t.amount_oc, 0)
        const noSum = mTrades.filter(t => t.position === 'no').reduce((s, t) => s + t.amount_oc, 0)
        let yp = m.yes_pool - yesSum
        let np = m.no_pool - noSum
        const pts: number[] = []
        const snap = () => { const t = yp + np; pts.push(t > 0 ? Math.round(yp / t * 100) : 50) }
        snap()
        for (const trade of mTrades) {
          if (trade.position === 'yes') yp += trade.amount_oc
          else np += trade.amount_oc
          snap()
        }
        sparklines[m.id] = pts
      }
    }
  }

  return (
    <div className="min-h-screen">
      <Navbar />

      <main
        className="max-w-6xl mx-auto px-4 flex flex-col"
        style={{ minHeight: 'calc(100vh - 3.5rem)' }}
      >
        {!user ? (
          <>
            <div className="text-center space-y-4 pt-6 pb-8 sm:py-12">
              <h1 className="text-5xl sm:text-6xl font-black tracking-tight text-zinc-100">
                You called it.
              </h1>
              <p className="text-lg text-zinc-400 max-w-xl mx-auto">
                Make your predictions count.
              </p>
            </div>

            <div className="relative flex-1">
              <div className="blur-sm pointer-events-none select-none">
                {openMarkets.length === 0 ? (
                  <div className="text-center py-16 rounded-2xl border border-zinc-800 bg-zinc-900/50">
                    <p className="text-zinc-400">No open markets yet.</p>
                    <p className="text-sm text-zinc-500 mt-1">Check back soon.</p>
                  </div>
                ) : (
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {standardMarkets.map((market) => (
                      <MarketCard key={market.id} market={market} sparkline={sparklines[market.id]} options={optionsByMarket[market.id]} />
                    ))}
                  </div>
                )}
                <ClosedMarkets />
              </div>

              <div className="fixed inset-0 flex items-center justify-center z-50">
                <div className="text-center space-y-3 bg-zinc-950/80 backdrop-blur-sm border border-zinc-800 rounded-2xl px-8 py-6">
                  <p className="text-zinc-100 font-semibold">Sign in to access markets</p>
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
            </div>
          </>
        ) : (
          <div className="py-10">
            <div className="space-y-1 mb-8">
              <h1 className="text-2xl font-bold text-zinc-100">Active Markets</h1>
              <p className="text-sm text-zinc-500">Click any market to trade</p>
            </div>

            {openMarkets.length === 0 ? (
              <div className="text-center py-16 rounded-2xl border border-zinc-800 bg-zinc-900/50">
                <p className="text-zinc-400">No open markets yet.</p>
                <p className="text-sm text-zinc-500 mt-1">Check back soon.</p>
              </div>
            ) : (
              <MarketsSortableGrid
                markets={standardMarkets}
                optionsByMarket={optionsByMarket}
                sparklines={sparklines}
                specialCategories={specialCategories.map(cat => ({
                  name: cat,
                  count: openMarkets.filter(m => m.category === cat).length,
                }))}
              />
            )}
            <ClosedMarkets />
          </div>
        )}
      </main>
    </div>
  )
}

async function ClosedMarkets() {
  const supabase = await createClient()
  const { data } = await supabase
    .from('markets')
    .select('*')
    .in('status', ['closed', 'resolved'])
    .in('category', STANDARD_CATEGORIES)
    .order('created_at', { ascending: false })
    .limit(6)

  if (!data?.length) return null

  const closedMarkets = data as Market[]
  const multiIds = closedMarkets.filter(m => m.market_type === 'multi').map(m => m.id)
  const optionsByMarket: Record<string, MarketOption[]> = {}
  if (multiIds.length > 0) {
    const { data: allOptions } = await supabase
      .from('market_options')
      .select('*')
      .in('market_id', multiIds)
      .order('ord', { ascending: true })
    for (const opt of allOptions ?? []) {
      if (!optionsByMarket[opt.market_id]) optionsByMarket[opt.market_id] = []
      optionsByMarket[opt.market_id].push(opt as MarketOption)
    }
  }

  return (
    <div className="mt-12 space-y-4">
      <h3 className="text-sm font-medium text-zinc-500 uppercase tracking-wide">Past markets</h3>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {closedMarkets.map((market) => (
          <MarketCard key={market.id} market={market} options={optionsByMarket[market.id]} />
        ))}
      </div>
    </div>
  )
}

import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import Navbar from '@/components/Navbar'
import MarketsSortableGrid from '@/components/MarketsSortableGrid'
import { redirect } from 'next/navigation'
import type { Market, MarketOption } from '@/lib/types'

export const revalidate = 60

export default async function CategoryPage({ params }: { params: Promise<{ name: string }> }) {
  const { name } = await params
  const category = decodeURIComponent(name)

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: markets } = await supabase
    .from('markets')
    .select('*')
    .eq('category', category)
    .eq('status', 'open')
    .order('created_at', { ascending: false })

  const openMarkets = (markets ?? []) as Market[]

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

  return (
    <div className="min-h-screen">
      <Navbar />
      <main className="max-w-6xl mx-auto px-4 py-10">
        <div className="space-y-1 mb-8">
          <Link href="/" className="text-sm text-zinc-500 hover:text-zinc-300 transition">← Back</Link>
          <h1 className="text-2xl font-bold text-zinc-100">{category}</h1>
          <p className="text-sm text-zinc-500">{openMarkets.length} active market{openMarkets.length !== 1 ? 's' : ''}</p>
        </div>

        {openMarkets.length === 0 ? (
          <div className="text-center py-16 rounded-2xl border border-zinc-800 bg-zinc-900/50">
            <p className="text-zinc-400">No open markets in this category.</p>
            <p className="text-sm text-zinc-500 mt-1">Check back soon.</p>
          </div>
        ) : (
          <MarketsSortableGrid markets={openMarkets} optionsByMarket={optionsByMarket} />
        )}
      </main>
    </div>
  )
}

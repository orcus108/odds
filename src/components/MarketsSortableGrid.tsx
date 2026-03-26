'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import MarketCard from './MarketCard'
import type { Market, MarketOption } from '@/lib/types'

type SortMode = 'volume' | 'closing'

interface SpecialCategory {
  name: string
  count: number
}

interface Props {
  markets: Market[]
  optionsByMarket: Record<string, MarketOption[]>
  sparklines?: Record<string, number[]>
  specialCategories?: SpecialCategory[]
}

function marketVolume(market: Market, optionsByMarket: Record<string, MarketOption[]>) {
  if (market.market_type === 'multi') {
    const opts = optionsByMarket[market.id] ?? []
    return opts.reduce((s, o) => s + o.pool, 0)
  }
  return market.yes_pool + market.no_pool
}

export default function MarketsSortableGrid({ markets, optionsByMarket, sparklines, specialCategories }: Props) {
  const [sort, setSort] = useState<SortMode>('volume')

  const sorted = useMemo(() => {
    return [...markets].sort((a, b) => {
      if (sort === 'closing') {
        return new Date(a.closes_at).getTime() - new Date(b.closes_at).getTime()
      }
      // volume desc, ties broken by closes_at asc
      const vDiff = marketVolume(b, optionsByMarket) - marketVolume(a, optionsByMarket)
      if (vDiff !== 0) return vDiff
      return new Date(a.closes_at).getTime() - new Date(b.closes_at).getTime()
    })
  }, [markets, optionsByMarket, sort])

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <span className="text-xs text-zinc-500">Sort by</span>
        <button
          onClick={() => setSort('volume')}
          className={`text-xs px-3 py-1 rounded-full border transition ${
            sort === 'volume'
              ? 'border-zinc-500 text-zinc-100 bg-zinc-800'
              : 'border-zinc-700 text-zinc-500 hover:text-zinc-300 hover:border-zinc-600'
          }`}
        >
          Highest volume
        </button>
        <button
          onClick={() => setSort('closing')}
          className={`text-xs px-3 py-1 rounded-full border transition ${
            sort === 'closing'
              ? 'border-zinc-500 text-zinc-100 bg-zinc-800'
              : 'border-zinc-700 text-zinc-500 hover:text-zinc-300 hover:border-zinc-600'
          }`}
        >
          Closing soon
        </button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {specialCategories?.map((cat) => (
          <Link
            key={cat.name}
            href={`/category/${encodeURIComponent(cat.name)}`}
            className="block rounded-2xl border border-accent/30 bg-accent/5 p-5 hover:border-accent/60 hover:bg-accent/10 transition group"
          >
            <div className="flex items-center justify-between gap-3">
              <div className="space-y-1">
                <p className="text-xs text-accent/70 font-medium uppercase tracking-widest">Special Event</p>
                <p className="text-xl font-bold text-zinc-100 group-hover:text-white transition">{cat.name}</p>
                <p className="text-sm text-zinc-400">{cat.count} active market{cat.count !== 1 ? 's' : ''}</p>
              </div>
              <div className="text-accent/50 group-hover:text-accent transition text-2xl">→</div>
            </div>
          </Link>
        ))}
        {sorted.map((market) => (
          <MarketCard
            key={market.id}
            market={market}
            sparkline={sparklines?.[market.id]}
            options={optionsByMarket[market.id]}
          />
        ))}
      </div>
    </div>
  )
}

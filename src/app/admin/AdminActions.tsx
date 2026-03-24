'use client'

import { useState, useTransition } from 'react'
import { closeMarket, resolveMarket, resolveMultiMarket } from '@/actions/market'
import type { Market, MarketOption } from '@/lib/types'

interface Props {
  market: Market
  options?: MarketOption[]
}

export default function AdminActions({ market, options }: Props) {
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState('')
  const isMulti = market.market_type === 'multi'

  function handleClose() {
    if (!confirm('Close this market to further trading?')) return
    setError('')
    startTransition(async () => {
      const res = await closeMarket(market.id)
      if (res?.error) setError(res.error)
    })
  }

  function handleResolveBinary(outcome: 'yes' | 'no') {
    if (!confirm(`Resolve as ${outcome.toUpperCase()}? This will distribute payouts and cannot be undone.`)) return
    setError('')
    startTransition(async () => {
      const res = await resolveMarket(market.id, outcome)
      if (res?.error) setError(res.error)
    })
  }

  function handleResolveMulti(option: MarketOption) {
    if (!confirm(`Resolve as "${option.label}"? This will distribute payouts and cannot be undone.`)) return
    setError('')
    startTransition(async () => {
      const res = await resolveMultiMarket(market.id, option.id)
      if (res?.error) setError(res.error)
    })
  }

  if (market.status === 'resolved') {
    if (isMulti) {
      const winningLabel = options?.find(o => o.id === market.outcome)?.label ?? market.outcome
      return (
        <p className="text-xs text-zinc-500">
          Resolved: <span className="text-accent">{winningLabel}</span>
        </p>
      )
    }
    return (
      <p className="text-xs text-zinc-500">
        Resolved as <span className={market.outcome === 'yes' ? 'text-green-400' : 'text-red-400'}>
          {market.outcome?.toUpperCase()}
        </span>
      </p>
    )
  }

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {market.status === 'open' && (
        <button
          onClick={handleClose}
          disabled={isPending}
          className="rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-1.5 text-xs font-medium text-zinc-300 hover:bg-zinc-700 transition disabled:opacity-40"
        >
          Close market
        </button>
      )}

      {(market.status === 'open' || market.status === 'closed') && (
        isMulti ? (
          options && options.length > 0 ? (
            options.map((opt) => (
              <button
                key={opt.id}
                onClick={() => handleResolveMulti(opt)}
                disabled={isPending}
                className="rounded-lg border border-accent/30 bg-accent/10 px-3 py-1.5 text-xs font-medium text-accent hover:bg-accent/20 transition disabled:opacity-40"
              >
                Resolve: {opt.label}
              </button>
            ))
          ) : (
            <span className="text-xs text-zinc-500">No options found</span>
          )
        ) : (
          <>
            <button
              onClick={() => handleResolveBinary('yes')}
              disabled={isPending}
              className="rounded-lg border border-green-500/30 bg-green-500/10 px-3 py-1.5 text-xs font-medium text-green-400 hover:bg-green-500/20 transition disabled:opacity-40"
            >
              Resolve YES
            </button>
            <button
              onClick={() => handleResolveBinary('no')}
              disabled={isPending}
              className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-1.5 text-xs font-medium text-red-400 hover:bg-red-500/20 transition disabled:opacity-40"
            >
              Resolve NO
            </button>
          </>
        )
      )}

      {error && <p className="text-xs text-red-400 w-full">{error}</p>}
    </div>
  )
}

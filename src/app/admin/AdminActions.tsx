'use client'

import { useState, useTransition } from 'react'
import { closeMarket, resolveMarket } from '@/actions/market'
import type { Market } from '@/lib/types'

export default function AdminActions({ market }: { market: Market }) {
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState('')

  function handleClose() {
    if (!confirm('Close this market to further trading?')) return
    setError('')
    startTransition(async () => {
      const res = await closeMarket(market.id)
      if (res?.error) setError(res.error)
    })
  }

  function handleResolve(outcome: 'yes' | 'no') {
    if (!confirm(`Resolve as ${outcome.toUpperCase()}? This will distribute payouts and cannot be undone.`)) return
    setError('')
    startTransition(async () => {
      const res = await resolveMarket(market.id, outcome)
      if (res?.error) setError(res.error)
    })
  }

  if (market.status === 'resolved') {
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
        <>
          <button
            onClick={() => handleResolve('yes')}
            disabled={isPending}
            className="rounded-lg border border-green-500/30 bg-green-500/10 px-3 py-1.5 text-xs font-medium text-green-400 hover:bg-green-500/20 transition disabled:opacity-40"
          >
            Resolve YES
          </button>
          <button
            onClick={() => handleResolve('no')}
            disabled={isPending}
            className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-1.5 text-xs font-medium text-red-400 hover:bg-red-500/20 transition disabled:opacity-40"
          >
            Resolve NO
          </button>
        </>
      )}
      {error && <p className="text-xs text-red-400 w-full">{error}</p>}
    </div>
  )
}

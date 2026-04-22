'use client'

import { useState, useTransition } from 'react'
import { approveMarket, rejectMarket } from '@/actions/market'
import type { Market, MarketOption } from '@/lib/types'

interface Props {
  market: Market
  options?: MarketOption[]
  proposerUsername?: string | null
}

export default function ProposalActions({ market, options, proposerUsername }: Props) {
  const [showApproveForm, setShowApproveForm] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState('')
  const isMulti = market.market_type === 'multi'

  function handleReject() {
    if (!confirm('Reject this proposal? It will be permanently deleted.')) return
    setError('')
    startTransition(async () => {
      const res = await rejectMarket(market.id)
      if (res?.error) setError(res.error)
    })
  }

  return (
    <div className="space-y-3">
      {proposerUsername && (
        <p className="text-xs text-zinc-500">
          Proposed by <span className="text-zinc-300">{proposerUsername}</span>
        </p>
      )}

      {!showApproveForm ? (
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setShowApproveForm(true)}
            disabled={isPending}
            className="rounded-lg border border-green-500/30 bg-green-500/10 px-3 py-1.5 text-xs font-medium text-green-400 hover:bg-green-500/20 transition disabled:opacity-40"
          >
            Approve
          </button>
          <button
            onClick={handleReject}
            disabled={isPending}
            className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-1.5 text-xs font-medium text-red-400 hover:bg-red-500/20 transition disabled:opacity-40"
          >
            Reject
          </button>
        </div>
      ) : (
        <form action={approveMarket} className="space-y-3 rounded-xl border border-zinc-700 bg-zinc-800/50 p-4">
          <input type="hidden" name="market_id" value={market.id} />
          <input type="hidden" name="market_type" value={market.market_type} />

          <p className="text-xs font-medium text-zinc-300">Set opening pools</p>

          {isMulti ? (
            <div className="space-y-2">
              {(options ?? []).map((opt, idx) => (
                <div key={opt.id} className="flex items-center gap-3">
                  <input type="hidden" name={`option_id_${idx}`} value={opt.id} />
                  <span
                    className="w-2 h-2 rounded-full shrink-0"
                    style={{ backgroundColor: opt.color }}
                  />
                  <span className="text-xs text-zinc-300 flex-1 truncate">{opt.label}</span>
                  <input
                    type="number"
                    name={`option_seed_${idx}`}
                    defaultValue={500}
                    min={1}
                    max={1000000}
                    className="w-24 rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-1.5 text-xs text-zinc-100 outline-none focus:border-accent/60"
                  />
                  <span className="text-xs text-zinc-500">OC</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex items-center gap-4 flex-wrap">
              <div className="flex items-center gap-2">
                <label className="text-xs text-green-400">YES</label>
                <input
                  type="number"
                  name="seed_yes"
                  defaultValue={500}
                  min={1}
                  max={1000000}
                  className="w-24 rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-1.5 text-xs text-zinc-100 outline-none focus:border-green-500/60"
                />
                <span className="text-xs text-zinc-500">OC</span>
              </div>
              <div className="flex items-center gap-2">
                <label className="text-xs text-red-400">NO</label>
                <input
                  type="number"
                  name="seed_no"
                  defaultValue={500}
                  min={1}
                  max={1000000}
                  className="w-24 rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-1.5 text-xs text-zinc-100 outline-none focus:border-red-500/60"
                />
                <span className="text-xs text-zinc-500">OC</span>
              </div>
            </div>
          )}

          <div className="flex gap-2">
            <button
              type="submit"
              className="rounded-lg border border-green-500/30 bg-green-500/10 px-3 py-1.5 text-xs font-medium text-green-400 hover:bg-green-500/20 transition"
            >
              Confirm approval
            </button>
            <button
              type="button"
              onClick={() => setShowApproveForm(false)}
              className="rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-1.5 text-xs font-medium text-zinc-400 hover:text-zinc-200 transition"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {error && <p className="text-xs text-red-400">{error}</p>}
    </div>
  )
}

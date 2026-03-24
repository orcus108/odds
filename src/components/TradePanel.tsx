'use client'

import { useState, useTransition } from 'react'
import { executeTrade } from '@/actions/trade'
import type { Market } from '@/lib/types'

interface Props {
  market: Market
  userBalance: number | null
  isAuthenticated: boolean
}

export default function TradePanel({ market, userBalance, isAuthenticated }: Props) {
  const [position, setPosition] = useState<'yes' | 'no'>('yes')
  const [amount, setAmount] = useState('')
  const [result, setResult] = useState<{ error?: string; success?: boolean } | null>(null)
  const [isPending, startTransition] = useTransition()

  const amountNum = parseInt(amount) || 0
  const total = market.yes_pool + market.no_pool

  function calcPayout(pos: 'yes' | 'no', amt: number) {
    if (amt <= 0) return 0
    const pool = pos === 'yes' ? market.yes_pool : market.no_pool
    const newTotal = total + amt
    const newPool = pool + amt
    return newTotal > 0 && newPool > 0 ? Math.floor((amt / newPool) * newTotal) : 0
  }

  const estimatedPayout = calcPayout(position, amountNum)
  const profit = estimatedPayout - amountNum
  const yesPayout = calcPayout('yes', amountNum)
  const noPayout = calcPayout('no', amountNum)

  const isOpen = market.status === 'open' && new Date(market.closes_at) > new Date()

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!isAuthenticated || !amountNum || amountNum < 1) return

    setResult(null)
    startTransition(async () => {
      const res = await executeTrade(market.id, position, amountNum)
      if (res?.error) {
        setResult({ error: res.error })
      } else {
        setResult({ success: true })
        setAmount('')
      }
    })
  }

  if (!isOpen) {
    return (
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5">
        <p className="text-zinc-400 text-sm text-center py-2">
          {market.status === 'resolved'
            ? `Market resolved: ${market.outcome?.toUpperCase() ?? 'N/A'}`
            : 'This market is closed for trading'}
        </p>
      </div>
    )
  }

  if (!isAuthenticated) {
    return (
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5 text-center space-y-3">
        <p className="text-zinc-400 text-sm">Sign in to trade on this market</p>
        <a
          href="/login"
          className="inline-block rounded-xl px-6 py-2.5 text-sm font-semibold text-white"
          style={{ background: 'var(--color-accent)' }}
        >
          Sign in
        </a>
      </div>
    )
  }

  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5 space-y-4">
      <h3 className="font-semibold text-zinc-100">Place a trade</h3>

      {/* Position toggle */}
      <div className="flex rounded-xl overflow-hidden border border-zinc-700">
        <button
          type="button"
          onClick={() => setPosition('yes')}
          className={`flex-1 py-2 text-sm font-semibold transition ${
            position === 'yes'
              ? 'bg-green-500 text-white'
              : 'bg-zinc-800 text-zinc-400 hover:text-zinc-200'
          }`}
        >
          YES
          {amountNum > 0 && (
            <div className="text-xs font-normal opacity-80">~{yesPayout.toLocaleString()} OC</div>
          )}
        </button>
        <button
          type="button"
          onClick={() => setPosition('no')}
          className={`flex-1 py-2 text-sm font-semibold transition ${
            position === 'no'
              ? 'bg-red-500 text-white'
              : 'bg-zinc-800 text-zinc-400 hover:text-zinc-200'
          }`}
        >
          NO
          {amountNum > 0 && (
            <div className="text-xs font-normal opacity-80">~{noPayout.toLocaleString()} OC</div>
          )}
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="space-y-1">
          <label className="text-xs text-zinc-400">Amount (OC)</label>
          <div className="flex items-center gap-2">
            <input
              type="number"
              min={1}
              max={userBalance ?? 1000}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="50"
              className="flex-1 rounded-xl border border-zinc-700 bg-zinc-800 px-4 py-2.5 text-sm text-zinc-100 placeholder-zinc-500 outline-none focus:border-accent/60 transition"
            />
            <button
              type="button"
              onClick={() => setAmount(String(userBalance ?? 0))}
              className="text-xs text-zinc-500 hover:text-accent transition px-2"
            >
              Max
            </button>
          </div>
          {userBalance !== null && (
            <p className="text-xs text-zinc-500">
              Balance: <span className="text-accent">{userBalance.toLocaleString()} OC</span>
            </p>
          )}
        </div>

        {/* Preview */}
        <div className="rounded-xl bg-zinc-800 p-3 space-y-1.5 text-xs">
          {amountNum > 0 ? (
            <>
              <div className="flex justify-between text-zinc-400">
                <span>Shares</span>
                <span className="text-zinc-200">{amountNum.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-zinc-400">
                <span>Payout if {position.toUpperCase()} wins</span>
                <span className="text-zinc-200">{estimatedPayout.toLocaleString()} OC</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-400">Net profit</span>
                <span className={profit >= 0 ? 'text-green-400' : 'text-red-400'}>
                  {profit >= 0 ? '+' : ''}{profit.toLocaleString()} OC
                </span>
              </div>
            </>
          ) : (
            <p className="text-zinc-500 text-center py-0.5">Enter an amount to see payout</p>
          )}
        </div>

        {result?.error && (
          <p className="text-xs text-red-400">{result.error}</p>
        )}
        {result?.success && (
          <p className="text-xs text-green-400">Trade placed successfully!</p>
        )}

        <button
          type="submit"
          disabled={isPending || !amountNum || amountNum < 1 || (userBalance !== null && amountNum > userBalance)}
          className={`w-full rounded-xl py-3 text-sm font-semibold text-white transition disabled:opacity-40 ${
            position === 'yes' ? 'bg-green-500 hover:bg-green-400' : 'bg-red-500 hover:bg-red-400'
          }`}
        >
          {isPending ? 'Placing…' : `Buy ${position.toUpperCase()} for ${amountNum || 0} OC`}
        </button>
      </form>
    </div>
  )
}

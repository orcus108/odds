'use client'

import { useState, useTransition } from 'react'
import { executeTrade } from '@/actions/trade'
import type { Market, MarketOption } from '@/lib/types'

interface Props {
  market: Market
  options?: MarketOption[]
  userBalance: number | null
  isAuthenticated: boolean
}

export default function TradePanel({ market, options, userBalance, isAuthenticated }: Props) {
  const isMulti = market.market_type === 'multi'

  const [position, setPosition] = useState<string>(
    isMulti ? (options?.[0]?.id ?? '') : 'yes'
  )
  const [amount, setAmount] = useState('')
  const [result, setResult] = useState<{ error?: string; success?: boolean } | null>(null)
  const [isPending, startTransition] = useTransition()

  const amountNum = parseInt(amount) || 0

  // Total pool across all options (multi) or yes+no (binary)
  const totalPool = isMulti
    ? (options ?? []).reduce((s, o) => s + o.pool, 0)
    : market.yes_pool + market.no_pool

  function calcPayout(poolForOption: number, amt: number): number {
    if (amt <= 0) return 0
    const newTotal = totalPool + amt
    const newPool = poolForOption + amt
    return newTotal > 0 && newPool > 0 ? Math.floor((amt / newPool) * newTotal) : 0
  }

  // For binary
  const yesPayout = calcPayout(market.yes_pool, amountNum)
  const noPayout = calcPayout(market.no_pool, amountNum)

  // For current selection
  const selectedPool = isMulti
    ? (options?.find(o => o.id === position)?.pool ?? 0)
    : position === 'yes' ? market.yes_pool : market.no_pool
  const estimatedPayout = calcPayout(selectedPool, amountNum)
  const profit = estimatedPayout - amountNum

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
    const resolvedLabel = isMulti
      ? options?.find(o => o.id === market.outcome)?.label ?? market.outcome
      : market.outcome?.toUpperCase() ?? 'N/A'

    return (
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5">
        <p className="text-zinc-400 text-sm text-center py-2">
          {market.status === 'resolved'
            ? `Market resolved: ${resolvedLabel}`
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

      {isMulti ? (
        <div className="space-y-2">
          {(options ?? []).map((opt) => {
            const optPct = totalPool === 0 ? 0 : Math.round((opt.pool / totalPool) * 100)
            const payout = calcPayout(opt.pool, amountNum)
            const isSelected = position === opt.id
            return (
              <button
                key={opt.id}
                type="button"
                onClick={() => setPosition(opt.id)}
                className="w-full text-left rounded-xl border px-4 py-2.5 transition"
                style={isSelected ? {
                  borderColor: opt.color,
                  backgroundColor: `${opt.color}18`,
                  color: '#f4f4f5',
                } : {
                  borderColor: '#3f3f46',
                  backgroundColor: '#27272a',
                  color: '#a1a1aa',
                }}
              >
                <div className="flex items-center gap-3">
                  <span
                    className="w-2.5 h-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: opt.color }}
                  />
                  <span className="text-sm font-medium flex-1">{opt.label}</span>
                  <div className="text-right">
                    <span className="text-xs" style={{ color: isSelected ? opt.color : '#71717a' }}>{optPct}%</span>
                    {amountNum > 0 && (
                      <div className="text-xs text-zinc-400">~{payout.toLocaleString()} OC</div>
                    )}
                  </div>
                </div>
              </button>
            )
          })}
        </div>
      ) : (
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
      )}

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

        <div className="rounded-xl bg-zinc-800 p-3 space-y-1.5 text-xs">
          {amountNum > 0 ? (
            <>
              <div className="flex justify-between text-zinc-400">
                <span>Shares</span>
                <span className="text-zinc-200">{amountNum.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-zinc-400">
                <span>Payout if {isMulti
                  ? (options?.find(o => o.id === position)?.label ?? 'selected')
                  : position.toUpperCase()} wins
                </span>
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
          className="w-full rounded-xl py-3 text-sm font-semibold text-white transition disabled:opacity-40"
          style={{ background: 'var(--color-accent)' }}
        >
          {isPending
            ? 'Placing…'
            : `Buy ${isMulti
                ? (options?.find(o => o.id === position)?.label ?? 'option')
                : position.toUpperCase()
              } for ${amountNum || 0} OC`}
        </button>
      </form>
    </div>
  )
}

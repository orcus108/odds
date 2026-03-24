import Link from 'next/link'
import ProbabilityBar from './ProbabilityBar'
import SparklineChart from './SparklineChart'
import type { Market, MarketOption } from '@/lib/types'

const STATUS_BADGE: Record<string, { label: string; color: string }> = {
  open: { label: 'Open', color: 'text-green-400 bg-green-500/10 border-green-500/20' },
  closed: { label: 'Closed', color: 'text-zinc-400 bg-zinc-800 border-zinc-700' },
  resolved: { label: 'Resolved', color: 'text-accent bg-accent/10 border-accent/20' },
}

function timeLeft(closesAt: string) {
  const diff = new Date(closesAt).getTime() - Date.now()
  if (diff <= 0) return 'Ended'
  const days = Math.floor(diff / 86400000)
  if (days > 0) return `${days}d left`
  const hours = Math.floor(diff / 3600000)
  return `${hours}h left`
}

interface Props {
  market: Market
  sparkline?: number[]
  options?: MarketOption[]
}

export default function MarketCard({ market, sparkline, options }: Props) {
  const isMulti = market.market_type === 'multi'
  const badge = STATUS_BADGE[market.status]

  // Binary stats
  const binaryTotal = market.yes_pool + market.no_pool
  const yesPct = binaryTotal === 0 ? 50 : Math.round((market.yes_pool / binaryTotal) * 100)

  // Multi stats
  const multiTotal = isMulti && options ? options.reduce((s, o) => s + o.pool, 0) : 0
  const total = isMulti ? multiTotal : binaryTotal

  return (
    <Link
      href={`/market/${market.id}`}
      className="block rounded-2xl border border-zinc-800 bg-zinc-900 p-5 space-y-4 hover:border-zinc-700 transition group"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1 flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs text-zinc-500 border border-zinc-700 rounded-full px-2 py-0.5">
              {market.category}
            </span>
            <span className={`text-xs border rounded-full px-2 py-0.5 ${badge.color}`}>
              {badge.label}
            </span>
          </div>
          <p className="text-zinc-100 font-medium leading-snug group-hover:text-white transition line-clamp-2">
            {market.title}
          </p>
        </div>
        <div className="text-right shrink-0">
          {isMulti ? (
            <div className="text-sm font-semibold text-zinc-400">{options?.length ?? 0} options</div>
          ) : (
            <>
              <div className="text-2xl font-bold text-green-400">{yesPct}%</div>
              <div className="text-xs text-zinc-500">chance YES</div>
            </>
          )}
        </div>
      </div>

      {isMulti && options && options.length > 0 ? (
        <div className="space-y-1.5">
          {options.slice(0, 3).map((opt) => {
            const pct = multiTotal === 0 ? Math.round(100 / options.length) : Math.round((opt.pool / multiTotal) * 100)
            return (
              <div key={opt.id} className="flex items-center gap-2">
                <div className="flex-1 h-1.5 rounded-full bg-zinc-800 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-zinc-500"
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <span className="text-xs text-zinc-400 w-16 text-right truncate">{opt.label}</span>
                <span className="text-xs text-zinc-500 w-8 text-right">{pct}%</span>
              </div>
            )
          })}
          {options.length > 3 && (
            <p className="text-xs text-zinc-600">+{options.length - 3} more</p>
          )}
        </div>
      ) : !isMulti ? (
        <>
          <ProbabilityBar yesPool={market.yes_pool} noPool={market.no_pool} />
          {sparkline && sparkline.length >= 2 && (
            <SparklineChart data={sparkline} height={32} />
          )}
        </>
      ) : null}

      <div className="flex items-center justify-between text-xs text-zinc-500">
        <span>
          <span className="text-zinc-300 font-medium">{total.toLocaleString()} OC</span> volume
        </span>
        <span>{timeLeft(market.closes_at)}</span>
      </div>
    </Link>
  )
}

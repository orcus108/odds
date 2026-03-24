import Link from 'next/link'
import ProbabilityBar from './ProbabilityBar'
import SparklineChart from './SparklineChart'
import type { Market } from '@/lib/types'

const STATUS_BADGE: Record<string, { label: string; color: string }> = {
  open: { label: 'Open', color: 'text-green-400 bg-green-500/10 border-green-500/20' },
  closed: { label: 'Closed', color: 'text-zinc-400 bg-zinc-800 border-zinc-700' },
  resolved: { label: 'Resolved', color: 'text-amber-400 bg-amber-500/10 border-amber-500/20' },
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
}

export default function MarketCard({ market, sparkline }: Props) {
  const total = market.yes_pool + market.no_pool
  const yesPct =
    total === 0 ? 50 : Math.round((market.yes_pool / total) * 100)
  const badge = STATUS_BADGE[market.status]

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
            <span
              className={`text-xs border rounded-full px-2 py-0.5 ${badge.color}`}
            >
              {badge.label}
            </span>
          </div>
          <p className="text-zinc-100 font-medium leading-snug group-hover:text-white transition line-clamp-2">
            {market.title}
          </p>
        </div>
        <div className="text-right shrink-0">
          <div className="text-2xl font-bold text-green-400">{yesPct}%</div>
          <div className="text-xs text-zinc-500">chance YES</div>
        </div>
      </div>

      <ProbabilityBar yesPool={market.yes_pool} noPool={market.no_pool} />

      {sparkline && sparkline.length >= 2 && (
        <SparklineChart data={sparkline} height={32} />
      )}

      <div className="flex items-center justify-between text-xs text-zinc-500">
        <span>
          <span className="text-zinc-300 font-medium">{total.toLocaleString()} OC</span> volume
        </span>
        <span>{timeLeft(market.closes_at)}</span>
      </div>
    </Link>
  )
}

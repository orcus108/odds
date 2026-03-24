import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import Navbar from '@/components/Navbar'
import AdminActions from './AdminActions'
import type { Market } from '@/lib/types'

export const revalidate = 0

function formatDate(d: string) {
  return new Date(d).toLocaleDateString('en-IN', {
    day: 'numeric', month: 'short', year: 'numeric',
  })
}

export default async function AdminPage() {
  const supabase = await createClient()

  const { data: markets } = await supabase
    .from('markets')
    .select('*')
    .order('created_at', { ascending: false })

  const allMarkets = (markets ?? []) as Market[]

  return (
    <div className="min-h-screen">
      <Navbar />

      <main className="max-w-5xl mx-auto px-4 py-10 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-zinc-100">Admin Dashboard</h1>
            <p className="text-sm text-zinc-500 mt-1">{allMarkets.length} markets total</p>
          </div>
          <Link
            href="/admin/create"
            className="rounded-xl px-5 py-2.5 text-sm font-semibold text-white transition hover:brightness-110"
            style={{ background: 'var(--color-accent)' }}
          >
            + New market
          </Link>
        </div>

        <div className="space-y-3">
          {allMarkets.length === 0 ? (
            <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-8 text-center text-zinc-400">
              No markets yet. Create one!
            </div>
          ) : (
            allMarkets.map((market) => (
              <div
                key={market.id}
                className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5 space-y-3"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-1 flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`text-xs border rounded-full px-2 py-0.5 ${
                        market.status === 'open'
                          ? 'text-green-400 bg-green-500/10 border-green-500/20'
                          : market.status === 'closed'
                          ? 'text-zinc-400 bg-zinc-800 border-zinc-700'
                          : 'text-accent bg-accent/10 border-accent/20'
                      }`}>
                        {market.status}
                        {market.outcome ? ` · ${market.outcome.toUpperCase()}` : ''}
                      </span>
                      <span className="text-xs text-zinc-500">{market.category}</span>
                    </div>
                    <Link
                      href={`/market/${market.id}`}
                      className="font-medium text-zinc-100 hover:text-accent transition"
                    >
                      {market.title}
                    </Link>
                  </div>
                  <div className="text-right shrink-0 text-sm">
                    <div className="text-accent font-semibold">
                      {(market.yes_pool + market.no_pool).toLocaleString()} OC
                    </div>
                    <div className="text-zinc-500 text-xs">Closes {formatDate(market.closes_at)}</div>
                  </div>
                </div>

                <AdminActions market={market} />
              </div>
            ))
          )}
        </div>
      </main>
    </div>
  )
}

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Navbar from '@/components/Navbar'

export const revalidate = 0

function formatDate(d: string) {
  return new Date(d).toLocaleDateString('en-IN', {
    day: 'numeric', month: 'short', year: 'numeric',
  })
}

export default async function ProfilePage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: userData } = await supabase
    .from('users')
    .select('username, balance_oc, created_at')
    .eq('id', user.id)
    .single()

  if (!userData) redirect('/login')

  const { count: tradeCount } = await supabase
    .from('trades')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', user.id)

  return (
    <div className="min-h-screen">
      <Navbar />

      <main className="max-w-lg mx-auto px-4 py-10 space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-zinc-100">{userData.username ?? 'Anonymous'}</h1>
          <p className="text-sm text-zinc-500 mt-1">Joined {formatDate(userData.created_at)}</p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-4">
            <div className="text-2xl font-black text-accent">{userData.balance_oc.toLocaleString()}</div>
            <div className="text-xs text-zinc-500 mt-1">Oddcoins</div>
          </div>
          <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-4">
            <div className="text-2xl font-bold text-zinc-100">{tradeCount ?? 0}</div>
            <div className="text-xs text-zinc-500 mt-1">Trades placed</div>
          </div>
        </div>
      </main>
    </div>
  )
}

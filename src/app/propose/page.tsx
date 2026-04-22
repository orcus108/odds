import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import Navbar from '@/components/Navbar'
import ProposeMarketForm from '@/components/ProposeMarketForm'

export const revalidate = 0

export default async function ProposePage({
  searchParams,
}: {
  searchParams: Promise<{ submitted?: string }>
}) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { submitted } = await searchParams

  if (submitted === '1') {
    return (
      <div className="min-h-screen">
        <Navbar />
        <main className="max-w-2xl mx-auto px-4 py-10">
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-8 text-center space-y-3">
            <div className="text-3xl">✓</div>
            <h1 className="text-xl font-bold text-zinc-100">Proposal submitted!</h1>
            <p className="text-sm text-zinc-400">
              Your market proposal is under review. It'll go live once an admin approves it.
            </p>
            <div className="flex gap-3 justify-center pt-2">
              <Link
                href="/propose"
                className="rounded-xl border border-zinc-700 px-5 py-2.5 text-sm text-zinc-400 hover:text-zinc-200 transition"
              >
                Propose another
              </Link>
              <Link
                href="/"
                className="rounded-xl px-5 py-2.5 text-sm font-semibold text-white transition hover:brightness-110"
                style={{ background: 'var(--color-accent)' }}
              >
                Back to markets
              </Link>
            </div>
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen">
      <Navbar />
      <main className="max-w-2xl mx-auto px-4 py-10 space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-zinc-100">Propose a market</h1>
          <p className="text-sm text-zinc-500 mt-1">
            Reviewed by an admin before going live. Up to 5 proposals per day.
          </p>
        </div>

        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 px-5 py-4 space-y-2.5">
          <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">What gets approved</p>
          <ul className="space-y-1.5 text-sm text-zinc-400">
            <li><span className="text-zinc-200">Clear title.</span> Ask a specific, unambiguous question — e.g. "Will IITM win Inter-IIT 2025?" not "Will we do well?"</li>
            <li><span className="text-zinc-200">Concrete resolution criteria.</span> State exactly how it resolves: what source, who decides, and by when — leave no room for interpretation.</li>
            <li><span className="text-zinc-200">Realistic closing date.</span> Give enough time for the event to actually happen. Tight deadlines get rejected.</li>
            <li><span className="text-zinc-200">Relevant to the community.</span> Campus events, academic outcomes, insti sports — markets people here actually care about.</li>
          </ul>
        </div>

        <ProposeMarketForm />
      </main>
    </div>
  )
}

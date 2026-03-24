import { createMarket } from '@/actions/market'
import Navbar from '@/components/Navbar'
import Link from 'next/link'

const CATEGORIES = ['Academics', 'Placements', 'Campus Life', 'Sports', 'Events', 'Other']

export default function CreateMarketPage() {
  return (
    <div className="min-h-screen">
      <Navbar />

      <main className="max-w-2xl mx-auto px-4 py-10 space-y-6">
        <div className="flex items-center gap-3">
          <Link href="/admin" className="text-zinc-500 hover:text-zinc-300 transition text-sm">
            ← Admin
          </Link>
          <h1 className="text-2xl font-bold text-zinc-100">Create Market</h1>
        </div>

        <form action={createMarket} className="space-y-5">
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6 space-y-5">
            <Field
              label="Question / Title"
              name="title"
              type="text"
              placeholder="Will the placement season exceed 1000 offers?"
              required
            />

            <div className="space-y-1.5">
              <label className="text-sm text-zinc-400">Description</label>
              <textarea
                name="description"
                rows={3}
                placeholder="Provide context for this market..."
                className="w-full rounded-xl border border-zinc-700 bg-zinc-800 px-4 py-3 text-sm text-zinc-100 placeholder-zinc-500 outline-none focus:border-amber-500/60 transition resize-none"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-sm text-zinc-400">Resolution criteria</label>
              <textarea
                name="resolution_criteria"
                rows={3}
                placeholder="How will this market be resolved? E.g. 'Resolves YES if the official placement report shows ≥1000 offers'"
                className="w-full rounded-xl border border-zinc-700 bg-zinc-800 px-4 py-3 text-sm text-zinc-100 placeholder-zinc-500 outline-none focus:border-amber-500/60 transition resize-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-sm text-zinc-400">Category</label>
                <select
                  name="category"
                  defaultValue="Other"
                  className="w-full rounded-xl border border-zinc-700 bg-zinc-800 px-4 py-3 text-sm text-zinc-100 outline-none focus:border-amber-500/60 transition"
                >
                  {CATEGORIES.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>

              <Field
                label="Closing date"
                name="closes_at"
                type="datetime-local"
                required
              />
            </div>
          </div>

          {/* Seed pools */}
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6 space-y-4">
            <div>
              <h2 className="font-medium text-zinc-200">Starting probability</h2>
              <p className="text-xs text-zinc-500 mt-0.5">
                Seed the YES/NO pools to set the opening price. This is free — no OC is deducted.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-sm text-green-400">YES pool (OC)</label>
                <input
                  type="number"
                  name="seed_yes"
                  min={0}
                  defaultValue={500}
                  className="w-full rounded-xl border border-zinc-700 bg-zinc-800 px-4 py-3 text-sm text-zinc-100 outline-none focus:border-green-500/60 transition"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm text-red-400">NO pool (OC)</label>
                <input
                  type="number"
                  name="seed_no"
                  min={0}
                  defaultValue={500}
                  className="w-full rounded-xl border border-zinc-700 bg-zinc-800 px-4 py-3 text-sm text-zinc-100 outline-none focus:border-red-500/60 transition"
                />
              </div>
            </div>
            <p className="text-xs text-zinc-500">
              Default 500/500 = 50% starting probability.
              E.g. 700/300 = 70% YES.
            </p>
          </div>

          <div className="flex gap-3">
            <button
              type="submit"
              className="flex-1 rounded-xl py-3 text-sm font-semibold text-zinc-900 transition hover:brightness-110"
              style={{ background: '#f59e0b' }}
            >
              Create market
            </button>
            <Link
              href="/admin"
              className="rounded-xl border border-zinc-700 px-5 py-3 text-sm text-zinc-400 hover:text-zinc-200 transition"
            >
              Cancel
            </Link>
          </div>
        </form>
      </main>
    </div>
  )
}

function Field({
  label,
  name,
  type,
  placeholder,
  required,
}: {
  label: string
  name: string
  type: string
  placeholder?: string
  required?: boolean
}) {
  return (
    <div className="space-y-1.5">
      <label className="text-sm text-zinc-400">{label}</label>
      <input
        type={type}
        name={name}
        placeholder={placeholder}
        required={required}
        className="w-full rounded-xl border border-zinc-700 bg-zinc-800 px-4 py-3 text-sm text-zinc-100 placeholder-zinc-500 outline-none focus:border-amber-500/60 transition"
      />
    </div>
  )
}

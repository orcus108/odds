'use client'

import { useState } from 'react'
import Link from 'next/link'
import { createMarket } from '@/actions/market'

const STANDARD_CATEGORIES = ['Acads', 'Insti Life', 'Sports']

interface OptionRow {
  label: string
  seed: string
}

export default function CreateMarketForm() {
  const [marketType, setMarketType] = useState<'binary' | 'multi'>('binary')
  const [options, setOptions] = useState<OptionRow[]>([
    { label: '', seed: '500' },
    { label: '', seed: '500' },
  ])

  function addOption() {
    if (options.length >= 20) return
    setOptions([...options, { label: '', seed: '500' }])
  }

  function removeOption(idx: number) {
    if (options.length <= 2) return
    setOptions(options.filter((_, i) => i !== idx))
  }

  function updateOption(idx: number, field: keyof OptionRow, value: string) {
    setOptions(options.map((opt, i) => i === idx ? { ...opt, [field]: value } : opt))
  }

  return (
    <form action={createMarket} className="space-y-5">
      <input type="hidden" name="market_type" value={marketType} />

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
            className="w-full rounded-xl border border-zinc-700 bg-zinc-800 px-4 py-3 text-sm text-zinc-100 placeholder-zinc-500 outline-none focus:border-accent/60 transition resize-none"
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-sm text-zinc-400">Resolution criteria</label>
          <textarea
            name="resolution_criteria"
            rows={3}
            placeholder="How will this market be resolved?"
            className="w-full rounded-xl border border-zinc-700 bg-zinc-800 px-4 py-3 text-sm text-zinc-100 placeholder-zinc-500 outline-none focus:border-accent/60 transition resize-none"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-sm text-zinc-400">Category</label>
            <input
              list="category-suggestions"
              name="category"
              defaultValue="Acads"
              placeholder="Acads, Insti Life, Sports, IPL…"
              className="w-full rounded-xl border border-zinc-700 bg-zinc-800 px-4 py-3 text-sm text-zinc-100 placeholder-zinc-500 outline-none focus:border-accent/60 transition"
            />
            <datalist id="category-suggestions">
              {STANDARD_CATEGORIES.map((c) => (
                <option key={c} value={c} />
              ))}
            </datalist>
            <p className="text-xs text-zinc-500">Pick a standard or type a special one</p>
          </div>

          <Field
            label="Closing date"
            name="closes_at"
            type="datetime-local"
            required
          />
        </div>
      </div>

      {/* Market type toggle */}
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6 space-y-4">
        <div>
          <h2 className="font-medium text-zinc-200">Market type</h2>
          <p className="text-xs text-zinc-500 mt-0.5">Binary is YES/NO. Multi-choice lets users pick from several options.</p>
        </div>
        <div className="flex rounded-xl overflow-hidden border border-zinc-700 w-fit">
          <button
            type="button"
            onClick={() => setMarketType('binary')}
            className={`px-5 py-2 text-sm font-semibold transition ${
              marketType === 'binary'
                ? 'bg-accent text-white'
                : 'bg-zinc-800 text-zinc-400 hover:text-zinc-200'
            }`}
          >
            YES / NO
          </button>
          <button
            type="button"
            onClick={() => setMarketType('multi')}
            className={`px-5 py-2 text-sm font-semibold transition ${
              marketType === 'multi'
                ? 'bg-accent text-white'
                : 'bg-zinc-800 text-zinc-400 hover:text-zinc-200'
            }`}
          >
            Multi-choice
          </button>
        </div>

        {marketType === 'binary' ? (
          <div className="space-y-3">
            <p className="text-xs text-zinc-500">
              Seed the YES/NO pools to set the opening price. This is free — no OC is deducted.
            </p>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-sm text-green-400">YES pool (OC)</label>
                <input
                  type="number"
                  name="seed_yes"
                  min={1}
                  defaultValue={500}
                  className="w-full rounded-xl border border-zinc-700 bg-zinc-800 px-4 py-3 text-sm text-zinc-100 outline-none focus:border-green-500/60 transition"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm text-red-400">NO pool (OC)</label>
                <input
                  type="number"
                  name="seed_no"
                  min={1}
                  defaultValue={500}
                  className="w-full rounded-xl border border-zinc-700 bg-zinc-800 px-4 py-3 text-sm text-zinc-100 outline-none focus:border-red-500/60 transition"
                />
              </div>
            </div>
            <p className="text-xs text-zinc-500">Default 500/500 = 50% starting probability.</p>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-xs text-zinc-500">
              Each option gets a seed pool to set its opening probability. This is free — no OC is deducted.
            </p>
            <div className="space-y-2">
              {options.map((opt, idx) => (
                <div key={idx} className="flex gap-2 items-center">
                  <span className="text-xs text-zinc-500 w-5 shrink-0">{idx + 1}.</span>
                  <input
                    type="text"
                    name={`option_label_${idx}`}
                    value={opt.label}
                    onChange={(e) => updateOption(idx, 'label', e.target.value)}
                    placeholder={`Option ${idx + 1} label`}
                    maxLength={100}
                    className="flex-1 rounded-xl border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100 placeholder-zinc-500 outline-none focus:border-accent/60 transition"
                  />
                  <input
                    type="number"
                    name={`option_seed_${idx}`}
                    value={opt.seed}
                    onChange={(e) => updateOption(idx, 'seed', e.target.value)}
                    min={1}
                    placeholder="Seed"
                    className="w-24 rounded-xl border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-accent/60 transition"
                  />
                  <button
                    type="button"
                    onClick={() => removeOption(idx)}
                    disabled={options.length <= 2}
                    className="text-zinc-600 hover:text-red-400 transition disabled:opacity-20 text-lg leading-none"
                    title="Remove option"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
            {options.length < 20 && (
              <button
                type="button"
                onClick={addOption}
                className="text-xs text-accent hover:text-accent/80 transition"
              >
                + Add option
              </button>
            )}
            <p className="text-xs text-zinc-500">
              Equal seeds = equal opening probability. E.g. all 500 = {Math.round(100 / options.length)}% each.
            </p>
          </div>
        )}
      </div>

      <div className="flex gap-3">
        <button
          type="submit"
          className="flex-1 rounded-xl py-3 text-sm font-semibold text-white transition hover:brightness-110"
          style={{ background: 'var(--color-accent)' }}
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
        className="w-full rounded-xl border border-zinc-700 bg-zinc-800 px-4 py-3 text-sm text-zinc-100 placeholder-zinc-500 outline-none focus:border-accent/60 transition"
      />
    </div>
  )
}

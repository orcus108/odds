'use client'

import { useState } from 'react'
import Link from 'next/link'
import { proposeMarket } from '@/actions/market'

const STANDARD_CATEGORIES = ['Acads', 'Insti Life', 'Sports']

const PALETTE = [
  '#6366f1', '#3b82f6', '#06b6d4', '#22c55e', '#84cc16',
  '#eab308', '#f97316', '#ef4444', '#ec4899', '#a855f7',
]

interface OptionRow {
  label: string
  color: string
}

function nextColor(index: number) {
  return PALETTE[index % PALETTE.length]
}

export default function ProposeMarketForm() {
  const [marketType, setMarketType] = useState<'binary' | 'multi'>('binary')
  const [options, setOptions] = useState<OptionRow[]>([
    { label: '', color: PALETTE[0] },
    { label: '', color: PALETTE[1] },
  ])

  function addOption() {
    if (options.length >= 20) return
    setOptions([...options, { label: '', color: nextColor(options.length) }])
  }

  function removeOption(idx: number) {
    if (options.length <= 2) return
    setOptions(options.filter((_, i) => i !== idx))
  }

  function updateOption(idx: number, field: keyof OptionRow, value: string) {
    setOptions(options.map((opt, i) => i === idx ? { ...opt, [field]: value } : opt))
  }

  return (
    <form action={proposeMarket} className="space-y-5">
      <input type="hidden" name="market_type" value={marketType} />

      <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6 space-y-5">
        <div className="space-y-1.5">
          <label className="text-sm text-zinc-400">Question / Title</label>
          <input
            type="text"
            name="title"
            placeholder="Will the placement season exceed 1000 offers?"
            required
            className="w-full rounded-xl border border-zinc-700 bg-zinc-800 px-4 py-3 text-sm text-zinc-100 placeholder-zinc-500 outline-none focus:border-accent/60 transition"
          />
        </div>

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
            placeholder="How should this market be resolved? Be specific."
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
          </div>

          <div className="space-y-1.5">
            <label className="text-sm text-zinc-400">Closing date</label>
            <input
              type="datetime-local"
              name="closes_at"
              required
              className="w-full rounded-xl border border-zinc-700 bg-zinc-800 px-4 py-3 text-sm text-zinc-100 placeholder-zinc-500 outline-none focus:border-accent/60 transition"
            />
          </div>
        </div>
      </div>

      {/* Market type */}
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
              marketType === 'binary' ? 'bg-accent text-white' : 'bg-zinc-800 text-zinc-400 hover:text-zinc-200'
            }`}
          >
            YES / NO
          </button>
          <button
            type="button"
            onClick={() => setMarketType('multi')}
            className={`px-5 py-2 text-sm font-semibold transition ${
              marketType === 'multi' ? 'bg-accent text-white' : 'bg-zinc-800 text-zinc-400 hover:text-zinc-200'
            }`}
          >
            Multi-choice
          </button>
        </div>

        {marketType === 'multi' && (
          <div className="space-y-3">
            <div className="space-y-3">
              {options.map((opt, idx) => (
                <div key={idx} className="space-y-2">
                  <div className="flex gap-2 items-center">
                    <label className="relative cursor-pointer shrink-0" title="Pick color">
                      <span
                        className="block w-7 h-7 rounded-lg border-2 border-zinc-600 transition hover:scale-110"
                        style={{ backgroundColor: opt.color }}
                      />
                      <input
                        type="color"
                        value={opt.color}
                        onChange={(e) => updateOption(idx, 'color', e.target.value)}
                        className="absolute inset-0 opacity-0 w-full h-full cursor-pointer"
                      />
                    </label>
                    <input type="hidden" name={`option_color_${idx}`} value={opt.color} />
                    <span className="text-xs text-zinc-500 w-4 shrink-0">{idx + 1}.</span>
                    <input
                      type="text"
                      name={`option_label_${idx}`}
                      value={opt.label}
                      onChange={(e) => updateOption(idx, 'label', e.target.value)}
                      placeholder={`Option ${idx + 1} label`}
                      maxLength={100}
                      className="flex-1 rounded-xl border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100 placeholder-zinc-500 outline-none focus:border-accent/60 transition"
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
                  <div className="flex gap-1.5 pl-9">
                    {PALETTE.map((color) => (
                      <button
                        key={color}
                        type="button"
                        onClick={() => updateOption(idx, 'color', color)}
                        className="w-4 h-4 rounded-full transition hover:scale-125"
                        style={{
                          backgroundColor: color,
                          outline: opt.color === color ? `2px solid ${color}` : 'none',
                          outlineOffset: '2px',
                        }}
                        title={color}
                      />
                    ))}
                  </div>
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
          </div>
        )}
      </div>

      <div className="flex gap-3">
        <button
          type="submit"
          className="flex-1 rounded-xl py-3 text-sm font-semibold text-white transition hover:brightness-110"
          style={{ background: 'var(--color-accent)' }}
        >
          Submit proposal
        </button>
        <Link
          href="/"
          className="rounded-xl border border-zinc-700 px-5 py-3 text-sm text-zinc-400 hover:text-zinc-200 transition"
        >
          Cancel
        </Link>
      </div>
    </form>
  )
}

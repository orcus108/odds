'use client'

import { useState, useMemo } from 'react'

const STARTING_BALANCE = 10000

type BoardEntry = {
  id: string
  username: string
  balance_oc: number
  trades: number
}

interface Props {
  board: BoardEntry[]
  currentUserId: string | null
}

export default function LeaderboardClient({ board, currentUserId }: Props) {
  const [sortBy, setSortBy] = useState<'balance' | 'profit'>('balance')

  const sorted = useMemo(() => {
    return [...board]
      .sort((a, b) => {
        if (sortBy === 'profit') {
          return (b.balance_oc - STARTING_BALANCE) - (a.balance_oc - STARTING_BALANCE)
        }
        return b.balance_oc - a.balance_oc
      })
      .map((u, i) => ({ ...u, displayRank: i + 1 }))
  }, [board, sortBy])

  const myIdx = currentUserId ? sorted.findIndex(u => u.id === currentUserId) : -1
  const myEntry = myIdx >= 0 ? sorted[myIdx] : null
  const above = myIdx > 0 ? sorted[myIdx - 1] : null
  const gapToNext = above && myEntry
    ? sortBy === 'profit'
      ? (above.balance_oc - STARTING_BALANCE) - (myEntry.balance_oc - STARTING_BALANCE)
      : above.balance_oc - myEntry.balance_oc
    : null

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <span className="text-xs text-zinc-500">Rank by</span>
        <button
          onClick={() => setSortBy('balance')}
          className={`text-xs px-3 py-1 rounded-full border transition ${
            sortBy === 'balance'
              ? 'border-zinc-500 text-zinc-100 bg-zinc-800'
              : 'border-zinc-700 text-zinc-500 hover:text-zinc-300 hover:border-zinc-600'
          }`}
        >
          Balance
        </button>
        <button
          onClick={() => setSortBy('profit')}
          className={`text-xs px-3 py-1 rounded-full border transition ${
            sortBy === 'profit'
              ? 'border-zinc-500 text-zinc-100 bg-zinc-800'
              : 'border-zinc-700 text-zinc-500 hover:text-zinc-300 hover:border-zinc-600'
          }`}
        >
          Profit
        </button>
      </div>

      {myEntry && above && gapToNext !== null && gapToNext > 0 && (
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 px-4 py-2.5 text-sm text-zinc-400">
          <span className="text-accent font-semibold">{gapToNext.toLocaleString()} OC</span>{' '}
          behind <span className="text-zinc-200 font-medium">#{myEntry.displayRank - 1} {above.username}</span>
        </div>
      )}

      <div className="rounded-2xl border border-zinc-800 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-zinc-800 bg-zinc-900/80">
              <th className="text-left px-4 py-3 text-zinc-500 font-medium">Rank</th>
              <th className="text-left px-4 py-3 text-zinc-500 font-medium">User</th>
              <th className="text-right px-4 py-3 text-zinc-500 font-medium">
                {sortBy === 'profit' ? 'Profit' : 'Balance'}
              </th>
              <th className="text-right px-4 py-3 text-zinc-500 font-medium hidden sm:table-cell">Trades</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((u) => {
              const isMe = currentUserId === u.id
              const profit = u.balance_oc - STARTING_BALANCE
              return (
                <tr
                  key={u.id}
                  className={`border-b border-zinc-800/50 last:border-0 ${
                    isMe ? 'bg-accent/5' : 'hover:bg-zinc-900/50'
                  } transition`}
                >
                  <td className="px-4 py-3.5">
                    {u.displayRank <= 3 ? (
                      <span className="text-base">
                        {u.displayRank === 1 ? '🥇' : u.displayRank === 2 ? '🥈' : '🥉'}
                      </span>
                    ) : (
                      <span className="text-zinc-500">#{u.displayRank}</span>
                    )}
                  </td>
                  <td className="px-4 py-3.5">
                    <span className={`font-medium ${isMe ? 'text-accent' : 'text-zinc-200'}`}>
                      {u.username}
                    </span>
                    {isMe && (
                      <span className="ml-2 text-xs text-accent/70">(you)</span>
                    )}
                  </td>
                  <td className="px-4 py-3.5 text-right">
                    {sortBy === 'profit' ? (
                      <span className={`font-semibold ${profit >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                        {profit >= 0 ? '+' : ''}{profit.toLocaleString()}
                        <span className="text-zinc-500 ml-1 font-normal text-xs">OC</span>
                      </span>
                    ) : (
                      <>
                        <span className="text-accent font-semibold">{u.balance_oc.toLocaleString()}</span>
                        <span className="text-zinc-500 ml-1">OC</span>
                      </>
                    )}
                  </td>
                  <td className="px-4 py-3.5 text-right text-zinc-400 hidden sm:table-cell">
                    {u.trades}
                  </td>
                </tr>
              )
            })}
            {sorted.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-zinc-500">
                  No users yet
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

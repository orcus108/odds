interface Props {
  yesPool: number
  noPool: number
  size?: 'sm' | 'lg'
}

export default function ProbabilityBar({ yesPool, noPool, size = 'sm' }: Props) {
  const total = yesPool + noPool
  const yesPct = total === 0 ? 50 : Math.round((yesPool / total) * 100)
  const noPct = 100 - yesPct

  const height = size === 'lg' ? 'h-4' : 'h-2'

  return (
    <div className="space-y-1.5">
      <div className={`flex rounded-full overflow-hidden ${height} bg-zinc-800`}>
        <div
          className="bg-green-500 transition-all duration-500"
          style={{ width: `${yesPct}%` }}
        />
        <div
          className="bg-red-500 transition-all duration-500"
          style={{ width: `${noPct}%` }}
        />
      </div>
      {size === 'lg' && (
        <div className="flex justify-between text-sm font-medium">
          <span className="text-green-400">{yesPct}% YES</span>
          <span className="text-red-400">{noPct}% NO</span>
        </div>
      )}
    </div>
  )
}

/** Skeleton du lobby /teen/battles — même gabarit que friend-defis. */
export default function BattlesLoading() {
  return (
    <div className="animate-pulse space-y-8 pt-8">
      <div className="h-12 w-full max-w-md rounded-2xl bg-card" />
      <div className="h-24 w-full rounded-2xl bg-card" />
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-28 rounded-2xl bg-card" />
        ))}
      </div>
    </div>
  )
}

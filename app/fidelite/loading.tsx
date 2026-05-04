import { Skeleton } from "@/components/ui/skeleton"

export default function FideliteLoading() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-zinc-900 to-zinc-950">
      {/* Hero */}
      <div className="container py-16 text-center space-y-6">
        <Skeleton className="h-12 w-72 mx-auto" />
        <Skeleton className="h-6 w-96 mx-auto" />
      </div>

      {/* User Card */}
      <div className="container max-w-2xl mb-16">
        <div className="rounded-2xl border bg-card p-8">
          <div className="flex items-center gap-6 mb-8">
            <Skeleton className="h-24 w-24 rounded-full" />
            <div className="space-y-2">
              <Skeleton className="h-6 w-40" />
              <Skeleton className="h-4 w-24" />
            </div>
          </div>
          <div className="space-y-4">
            <div className="flex justify-between">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-4 w-32" />
            </div>
            <Skeleton className="h-4 w-full rounded-full" />
          </div>
        </div>
      </div>

      {/* Tiers */}
      <div className="container py-16">
        <Skeleton className="h-8 w-40 mx-auto mb-12" />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="rounded-xl border bg-card p-6 text-center">
              <Skeleton className="h-16 w-16 rounded-full mx-auto mb-4" />
              <Skeleton className="h-6 w-24 mx-auto mb-2" />
              <Skeleton className="h-4 w-16 mx-auto mb-4" />
              <div className="space-y-2">
                {[...Array(3)].map((_, j) => (
                  <Skeleton key={j} className="h-3 w-full" />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

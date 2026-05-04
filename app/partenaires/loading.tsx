import { Skeleton } from "@/components/ui/skeleton"

export default function PartenairesLoading() {
  return (
    <div className="min-h-screen">
      {/* Hero */}
      <div className="bg-gradient-to-b from-zinc-900 to-zinc-950 py-20">
        <div className="container text-center space-y-6">
          <Skeleton className="h-12 w-80 mx-auto" />
          <Skeleton className="h-6 w-[500px] mx-auto" />
          <Skeleton className="h-12 w-48 mx-auto rounded-full" />
        </div>
      </div>

      {/* Partner Types */}
      <div className="container py-16">
        <Skeleton className="h-8 w-56 mx-auto mb-12" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="rounded-xl border bg-card p-6 text-center">
              <Skeleton className="h-16 w-16 rounded-full mx-auto mb-4" />
              <Skeleton className="h-6 w-28 mx-auto mb-2" />
              <Skeleton className="h-4 w-full mb-1" />
              <Skeleton className="h-4 w-3/4 mx-auto mb-4" />
              <Skeleton className="h-10 w-full rounded-lg" />
            </div>
          ))}
        </div>
      </div>

      {/* Benefits */}
      <div className="bg-muted/30 py-16">
        <div className="container">
          <Skeleton className="h-8 w-48 mx-auto mb-12" />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="flex gap-4">
                <Skeleton className="h-12 w-12 rounded-lg flex-shrink-0" />
                <div className="space-y-2">
                  <Skeleton className="h-5 w-32" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-3/4" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Featured Partners */}
      <div className="container py-16">
        <Skeleton className="h-8 w-48 mx-auto mb-12" />
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-8">
          {[...Array(6)].map((_, i) => (
            <Skeleton key={i} className="h-20 w-full rounded-lg" />
          ))}
        </div>
      </div>
    </div>
  )
}

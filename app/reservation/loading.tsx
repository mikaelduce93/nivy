import { Skeleton } from "@/components/ui/skeleton"

export default function ReservationLoading() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-zinc-900 to-zinc-950">
      <div className="container py-8">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 mb-8">
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-4 w-4" />
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-4 w-4" />
          <Skeleton className="h-4 w-32" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Event Info */}
            <div className="rounded-xl border bg-card p-6">
              <div className="flex gap-6">
                <Skeleton className="h-32 w-48 rounded-lg flex-shrink-0" />
                <div className="flex-1 space-y-3">
                  <Skeleton className="h-7 w-3/4" />
                  <Skeleton className="h-4 w-40" />
                  <Skeleton className="h-4 w-48" />
                  <div className="flex gap-2">
                    <Skeleton className="h-6 w-20 rounded-full" />
                    <Skeleton className="h-6 w-24 rounded-full" />
                  </div>
                </div>
              </div>
            </div>

            {/* Ticket Selection */}
            <div className="rounded-xl border bg-card p-6">
              <Skeleton className="h-6 w-40 mb-6" />
              <div className="space-y-4">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="flex items-center justify-between p-4 rounded-lg border">
                    <div className="space-y-1">
                      <Skeleton className="h-5 w-32" />
                      <Skeleton className="h-4 w-48" />
                    </div>
                    <div className="flex items-center gap-4">
                      <Skeleton className="h-6 w-20" />
                      <div className="flex items-center gap-2">
                        <Skeleton className="h-10 w-10 rounded" />
                        <Skeleton className="h-6 w-8" />
                        <Skeleton className="h-10 w-10 rounded" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Teen Assignment */}
            <div className="rounded-xl border bg-card p-6">
              <Skeleton className="h-6 w-48 mb-6" />
              <div className="space-y-4">
                {[...Array(2)].map((_, i) => (
                  <div key={i} className="p-4 rounded-lg border space-y-3">
                    <Skeleton className="h-5 w-32" />
                    <Skeleton className="h-10 w-full" />
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Summary Sidebar */}
          <div className="lg:col-span-1">
            <div className="rounded-xl border bg-card p-6 sticky top-24">
              <Skeleton className="h-6 w-32 mb-6" />
              <div className="space-y-4 mb-6">
                {[...Array(2)].map((_, i) => (
                  <div key={i} className="flex justify-between">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-4 w-16" />
                  </div>
                ))}
              </div>
              <div className="border-t pt-4 mb-6">
                <div className="flex justify-between">
                  <Skeleton className="h-6 w-16" />
                  <Skeleton className="h-8 w-24" />
                </div>
              </div>
              <Skeleton className="h-12 w-full rounded-lg" />
              <Skeleton className="h-4 w-48 mx-auto mt-4" />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

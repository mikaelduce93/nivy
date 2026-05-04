import { Skeleton } from "@/components/ui/skeleton"

export default function AmbassadeursLoading() {
  return (
    <div className="min-h-screen">
      {/* Hero */}
      <div className="bg-gradient-to-b from-zinc-900 to-zinc-950 py-20">
        <div className="container text-center space-y-6">
          <Skeleton className="h-12 w-96 mx-auto" />
          <Skeleton className="h-6 w-[500px] mx-auto" />
          <Skeleton className="h-12 w-48 mx-auto rounded-full" />
        </div>
      </div>

      {/* Benefits */}
      <div className="container py-16">
        <Skeleton className="h-8 w-64 mx-auto mb-12" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="rounded-xl border bg-card p-8 text-center">
              <Skeleton className="h-16 w-16 rounded-full mx-auto mb-4" />
              <Skeleton className="h-6 w-32 mx-auto mb-2" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4 mx-auto mt-1" />
            </div>
          ))}
        </div>
      </div>

      {/* Ambassadors Grid */}
      <div className="container py-16">
        <Skeleton className="h-8 w-48 mx-auto mb-12" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="text-center">
              <Skeleton className="h-32 w-32 rounded-full mx-auto mb-4" />
              <Skeleton className="h-5 w-24 mx-auto" />
              <Skeleton className="h-4 w-20 mx-auto mt-1" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

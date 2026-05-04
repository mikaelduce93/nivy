import { Skeleton } from "@/components/ui/skeleton"

export default function AnniversairesLoading() {
  return (
    <div className="min-h-screen">
      {/* Hero */}
      <div className="bg-gradient-to-b from-purple-950/50 to-zinc-950 py-20">
        <div className="container text-center space-y-6">
          <Skeleton className="h-12 w-80 mx-auto" />
          <Skeleton className="h-6 w-[450px] mx-auto" />
        </div>
      </div>

      {/* Packages */}
      <div className="container py-16">
        <Skeleton className="h-8 w-48 mx-auto mb-12" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="rounded-2xl border bg-card p-8">
              <Skeleton className="h-6 w-24 mb-4" />
              <Skeleton className="h-10 w-32 mb-6" />
              <div className="space-y-3 mb-8">
                {[...Array(5)].map((_, j) => (
                  <div key={j} className="flex items-center gap-2">
                    <Skeleton className="h-5 w-5 rounded-full" />
                    <Skeleton className="h-4 w-full" />
                  </div>
                ))}
              </div>
              <Skeleton className="h-12 w-full rounded-lg" />
            </div>
          ))}
        </div>
      </div>

      {/* Gallery */}
      <div className="container py-16">
        <Skeleton className="h-8 w-40 mx-auto mb-12" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[...Array(8)].map((_, i) => (
            <Skeleton key={i} className="aspect-square rounded-xl" />
          ))}
        </div>
      </div>
    </div>
  )
}

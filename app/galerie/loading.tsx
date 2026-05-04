import { HeaderSkeleton, FiltersSkeleton } from "@/components/ui/skeletons"
import { Skeleton } from "@/components/ui/skeleton"

export default function GalerieLoading() {
  return (
    <div className="min-h-screen">
      <div className="container py-12">
        <HeaderSkeleton showTitle={true} showSubtitle={true} />
        <FiltersSkeleton showSearch={false} filterCount={5} />
        
        {/* Gallery Grid with mixed aspect ratios */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mb-12">
          {[...Array(12)].map((_, i) => (
            <div key={i} className="group relative">
              <Skeleton className={`w-full rounded-xl ${i % 3 === 0 ? 'aspect-[3/4]' : 'aspect-square'}`} />
            </div>
          ))}
        </div>

        {/* Load More */}
        <div className="text-center">
          <Skeleton className="h-12 w-40 mx-auto rounded-full" />
        </div>
      </div>
    </div>
  )
}

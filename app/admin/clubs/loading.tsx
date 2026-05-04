import { PageSkeleton, FiltersSkeleton } from "@/components/ui/skeletons"
import { Skeleton } from "@/components/ui/skeleton"

export default function AdminClubsLoading() {
  return (
    <div className="container py-8 space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-64" />
        </div>
        <Skeleton className="h-10 w-40" />
      </div>

      {/* Filters */}
      <FiltersSkeleton showSearch={true} filterCount={2} />

      {/* Cards Grid */}
      <PageSkeleton
        content="grid"
        itemCount={6}
        columns={3}
        paddingTop={false}
        header={{}}
        showFilters={false}
        className="py-0"
      />
    </div>
  )
}

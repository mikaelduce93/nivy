import { SkeletonPresetStats, SkeletonDefiCard } from '@/components/ui/skeletons'

export default function Loading() {
  return (
    <div className="container mx-auto space-y-6 p-4 md:p-6">
      <SkeletonPresetStats count={3} columns="grid-cols-3" />
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <SkeletonDefiCard />
        <SkeletonDefiCard />
        <SkeletonDefiCard />
        <SkeletonDefiCard />
      </div>
    </div>
  )
}

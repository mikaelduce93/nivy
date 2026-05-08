import { SkeletonDefiCard } from '@/components/ui/skeletons'

export default function Loading() {
  return (
    <div className="container mx-auto space-y-4 p-4 md:p-6">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <SkeletonDefiCard withImage />
        <SkeletonDefiCard withImage />
        <SkeletonDefiCard withImage />
        <SkeletonDefiCard withImage />
      </div>
    </div>
  )
}

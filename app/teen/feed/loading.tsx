import { SkeletonPresetCard } from '@/components/ui/skeletons'

export default function Loading() {
  return (
    <div className="container mx-auto max-w-2xl space-y-4 p-4 md:p-6">
      <SkeletonPresetCard />
      <SkeletonPresetCard />
      <SkeletonPresetCard />
      <SkeletonPresetCard />
    </div>
  )
}

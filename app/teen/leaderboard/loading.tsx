import { SkeletonPresetStats, SkeletonPresetList } from '@/components/ui/skeletons'

export default function Loading() {
  return (
    <div className="container mx-auto space-y-6 p-4 md:p-6">
      <SkeletonPresetStats count={3} columns="grid-cols-3" />
      <SkeletonPresetList count={10} />
    </div>
  )
}

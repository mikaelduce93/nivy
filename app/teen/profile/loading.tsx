import { SkeletonPresetHero, SkeletonPresetStats, SkeletonPresetList } from '@/components/ui/skeletons'

export default function Loading() {
  return (
    <div className="container mx-auto space-y-6 p-4 md:p-6">
      <SkeletonPresetHero />
      <SkeletonPresetStats count={4} />
      <SkeletonPresetList count={5} />
    </div>
  )
}

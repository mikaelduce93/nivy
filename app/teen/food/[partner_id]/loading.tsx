import { SkeletonPresetHero, SkeletonPresetList } from '@/components/ui/skeletons'

export default function Loading() {
  return (
    <div className="container mx-auto space-y-6 p-4 md:p-6">
      <SkeletonPresetHero />
      <SkeletonPresetList count={6} />
    </div>
  )
}

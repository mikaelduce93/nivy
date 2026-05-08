import { SkeletonPresetHero, SkeletonPresetCard } from '@/components/ui/skeletons'

export default function Loading() {
  return (
    <div className="container mx-auto space-y-6 p-4 md:p-6">
      <SkeletonPresetHero />
      <div className="grid gap-4 md:grid-cols-2">
        <SkeletonPresetCard />
        <SkeletonPresetCard />
      </div>
    </div>
  )
}

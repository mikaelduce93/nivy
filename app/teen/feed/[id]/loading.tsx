import { SkeletonPresetHero, SkeletonPresetCard } from '@/components/ui/skeletons'

export default function Loading() {
  return (
    <div className="container mx-auto max-w-2xl space-y-6 p-4 md:p-6">
      <SkeletonPresetHero />
      <SkeletonPresetCard />
    </div>
  )
}

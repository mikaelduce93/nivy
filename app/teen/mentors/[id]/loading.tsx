import { SkeletonPresetHero, SkeletonPresetForm } from '@/components/ui/skeletons'

export default function Loading() {
  return (
    <div className="container mx-auto space-y-6 p-4 md:p-6">
      <SkeletonPresetHero />
      <SkeletonPresetForm fields={4} />
    </div>
  )
}

import { SkeletonImage, SkeletonPresetList } from '@/components/ui/skeletons'

export default function Loading() {
  return (
    <div className="container mx-auto space-y-6 p-4 md:p-6">
      <SkeletonImage aspectRatio="video" rounded="rounded-2xl" />
      <SkeletonPresetList count={4} />
    </div>
  )
}

import { SkeletonPresetForm } from '@/components/ui/skeletons'

export default function Loading() {
  return (
    <div className="container mx-auto max-w-xl space-y-6 p-4 md:p-8">
      <SkeletonPresetForm fields={6} />
    </div>
  )
}

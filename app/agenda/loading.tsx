import { PageSkeleton } from "@/components/ui/skeletons"

export default function AgendaLoading() {
  return (
    <PageSkeleton
      header={{
        title: true,
        subtitle: true,
        description: true,
      }}
      showFilters={true}
      content="grid"
      itemCount={6}
      columns={3}
    />
  )
}

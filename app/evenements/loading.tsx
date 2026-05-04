import { PageSkeleton } from "@/components/ui/skeletons"

export default function EventsLoading() {
  return (
    <PageSkeleton
      header={{
        title: true,
        subtitle: true,
        search: true,
      }}
      content="cards"
      itemCount={6}
      columns={3}
      paddingTop={false}
      className="py-32"
    />
  )
}

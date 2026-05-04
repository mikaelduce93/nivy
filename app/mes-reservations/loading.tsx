import { PageSkeleton } from "@/components/ui/skeletons"

export default function ReservationsLoading() {
  return (
    <PageSkeleton
      header={{ title: true }}
      content="cards"
      itemCount={3}
      columns={3}
      paddingTop={false}
      className="py-32"
    />
  )
}

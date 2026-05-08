import { Loading } from "@/components/ui/states/loading"

export default function ParentEventsLoading() {
  return (
    <Loading
      context="events"
      message="Chargement des événements..."
      size="large"
      variant="spinner"
    />
  )
}

import { Loading } from "@/components/ui/states/loading"

export default function PartnerEventsLoading() {
  return (
    <Loading
      context="events"
      message="Chargement des événements..."
      size="large"
      variant="spinner"
    />
  )
}

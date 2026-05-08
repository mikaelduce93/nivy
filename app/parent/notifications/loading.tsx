import { Loading } from "@/components/ui/states/loading"

export default function ParentNotificationsLoading() {
  return (
    <Loading
      context="notifications"
      message="Chargement des notifications..."
      size="large"
      variant="spinner"
    />
  )
}

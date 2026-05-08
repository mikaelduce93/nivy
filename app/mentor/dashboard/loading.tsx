import { Loading } from "@/components/ui/states/loading"

export default function MentorDashboardLoading() {
  return (
    <Loading
      message="Chargement du tableau de bord..."
      size="large"
      variant="spinner"
    />
  )
}

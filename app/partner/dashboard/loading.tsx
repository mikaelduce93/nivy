import { Loading } from "@/components/ui/states/loading"

export default function PartnerDashboardLoading() {
  return (
    <Loading
      message="Chargement du tableau de bord..."
      size="large"
      variant="spinner"
    />
  )
}

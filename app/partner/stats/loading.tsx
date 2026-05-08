import { Loading } from "@/components/ui/states/loading"

export default function PartnerStatsLoading() {
  return (
    <Loading
      message="Chargement des statistiques..."
      size="large"
      variant="spinner"
    />
  )
}

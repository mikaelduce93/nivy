import { Loading } from "@/components/ui/states/loading"

export default function AmbassadorReferralsLoading() {
  return (
    <Loading
      message="Chargement des parrainages..."
      size="large"
      variant="spinner"
    />
  )
}

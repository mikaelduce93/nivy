import { Loading } from "@/components/ui/states/loading"

export default function PartnerPayoutsLoading() {
  return (
    <Loading
      message="Chargement des paiements..."
      size="large"
      variant="spinner"
    />
  )
}

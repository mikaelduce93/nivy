import { Loading } from "@/components/ui/states/loading"

export default function PartnerOffersLoading() {
  return (
    <Loading
      message="Chargement des offres..."
      size="large"
      variant="spinner"
    />
  )
}

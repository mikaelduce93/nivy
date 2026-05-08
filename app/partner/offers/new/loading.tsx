import { Loading } from "@/components/ui/states/loading"

export default function PartnerOfferNewLoading() {
  return (
    <Loading
      message="Préparation du formulaire d'offre..."
      size="large"
      variant="spinner"
    />
  )
}

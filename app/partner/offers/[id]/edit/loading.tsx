import { Loading } from "@/components/ui/states/loading"

export default function PartnerOfferEditLoading() {
  return (
    <Loading
      message="Chargement de l'éditeur d'offre..."
      size="large"
      variant="spinner"
    />
  )
}

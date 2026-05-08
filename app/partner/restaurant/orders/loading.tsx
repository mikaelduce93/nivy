import { Loading } from "@/components/ui/states/loading"

export default function PartnerRestaurantOrdersLoading() {
  return (
    <Loading
      message="Chargement des commandes..."
      size="large"
      variant="spinner"
    />
  )
}

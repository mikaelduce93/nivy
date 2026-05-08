import { Loading } from "@/components/ui/states/loading"

export default function PartnerRestaurantMenuLoading() {
  return (
    <Loading
      message="Chargement du menu..."
      size="large"
      variant="spinner"
    />
  )
}

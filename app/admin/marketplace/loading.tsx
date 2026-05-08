import { Loading } from "@/components/ui/states/loading"

export default function AdminMarketplaceLoading() {
  return (
    <Loading
      message="Chargement de la marketplace..."
      size="large"
      variant="spinner"
    />
  )
}

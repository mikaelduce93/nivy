import { Loading } from "@/components/ui/states/loading"

export default function PartnerSupportLoading() {
  return (
    <Loading
      message="Chargement du support..."
      size="large"
      variant="spinner"
    />
  )
}

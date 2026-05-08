import { Loading } from "@/components/ui/states/loading"

export default function PartnerScannerLoading() {
  return (
    <Loading
      message="Chargement du scanner..."
      size="large"
      variant="spinner"
    />
  )
}

import { Loading } from "@/components/ui/states/loading"

export default function PartnerInvoicesLoading() {
  return (
    <Loading
      message="Chargement des factures..."
      size="large"
      variant="spinner"
    />
  )
}

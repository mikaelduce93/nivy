import { Loading } from "@/components/ui/states/loading"

export default function PartnerTransactionsLoading() {
  return (
    <Loading
      message="Chargement des transactions..."
      size="large"
      variant="spinner"
    />
  )
}

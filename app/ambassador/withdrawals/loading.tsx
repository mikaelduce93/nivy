import { Loading } from "@/components/ui/states/loading"

export default function AmbassadorWithdrawalsLoading() {
  return (
    <Loading
      message="Chargement des retraits..."
      size="large"
      variant="spinner"
    />
  )
}

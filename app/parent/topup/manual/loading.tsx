import { Loading } from "@/components/ui/states/loading"

export default function ParentTopupManualLoading() {
  return (
    <Loading
      context="payment"
      message="Chargement de la recharge manuelle..."
      size="large"
      variant="spinner"
    />
  )
}

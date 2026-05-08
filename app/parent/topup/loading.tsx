import { Loading } from "@/components/ui/states/loading"

export default function ParentTopupLoading() {
  return (
    <Loading
      context="payment"
      message="Chargement de la recharge..."
      size="large"
      variant="spinner"
    />
  )
}

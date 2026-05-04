import { Loading } from "@/components/ui/states/loading"

export default function AdminLoading() {
  return (
    <Loading
      context="auth"
      message="Chargement du panneau admin..."
      size="large"
      variant="spinner"
    />
  )
}

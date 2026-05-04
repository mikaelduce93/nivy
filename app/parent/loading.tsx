import { Loading } from "@/components/ui/states/loading"

export default function ParentLoading() {
  return (
    <Loading
      context="auth"
      message="Chargement de votre espace..."
      size="large"
      variant="spinner"
    />
  )
}

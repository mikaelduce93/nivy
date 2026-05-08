import { Loading } from "@/components/ui/states/loading"

export default function AmbassadorLoading() {
  return (
    <Loading
      context="auth"
      message="Chargement de votre espace ambassadeur..."
      size="large"
      variant="spinner"
    />
  )
}

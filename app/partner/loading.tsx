import { Loading } from "@/components/ui/states/loading"

export default function PartnerLoading() {
  return (
    <Loading
      context="auth"
      message="Chargement de votre espace partenaire..."
      size="large"
      variant="spinner"
    />
  )
}

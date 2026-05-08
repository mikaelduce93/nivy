import { Loading } from "@/components/ui/states/loading"

export default function AmbassadorBoutiqueLoading() {
  return (
    <Loading
      message="Chargement de la boutique..."
      size="large"
      variant="spinner"
    />
  )
}

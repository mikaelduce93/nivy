import { Loading } from "@/components/ui/states/loading"

export default function AdminEventEditLoading() {
  return (
    <Loading
      message="Chargement de l'éditeur d'événement..."
      size="large"
      variant="spinner"
    />
  )
}

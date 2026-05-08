import { Loading } from "@/components/ui/states/loading"

export default function AdminTagNormalizeLoading() {
  return (
    <Loading
      message="Chargement de la normalisation des tags..."
      size="large"
      variant="spinner"
    />
  )
}

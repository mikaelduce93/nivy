import { Loading } from "@/components/ui/states/loading"

export default function AdminContentReviewLoading() {
  return (
    <Loading
      message="Chargement de la modération de contenu..."
      size="large"
      variant="spinner"
    />
  )
}

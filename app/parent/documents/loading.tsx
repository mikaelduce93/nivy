import { Loading } from "@/components/ui/states/loading"

export default function ParentDocumentsLoading() {
  return (
    <Loading
      message="Chargement des documents..."
      size="large"
      variant="spinner"
    />
  )
}

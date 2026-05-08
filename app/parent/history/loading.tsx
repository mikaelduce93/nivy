import { Loading } from "@/components/ui/states/loading"

export default function ParentHistoryLoading() {
  return (
    <Loading
      message="Chargement de l'historique..."
      size="large"
      variant="spinner"
    />
  )
}

import { Loading } from "@/components/ui/states/loading"

export default function ParentGradesLoading() {
  return (
    <Loading
      message="Chargement des notes..."
      size="large"
      variant="spinner"
    />
  )
}

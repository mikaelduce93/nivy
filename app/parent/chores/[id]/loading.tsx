import { Loading } from "@/components/ui/states/loading"

export default function ParentChoreDetailLoading() {
  return (
    <Loading
      message="Chargement de la tâche..."
      size="large"
      variant="spinner"
    />
  )
}

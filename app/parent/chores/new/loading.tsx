import { Loading } from "@/components/ui/states/loading"

export default function ParentChoreNewLoading() {
  return (
    <Loading
      message="Préparation du formulaire de tâche..."
      size="large"
      variant="spinner"
    />
  )
}

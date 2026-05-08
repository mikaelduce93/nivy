import { Loading } from "@/components/ui/states/loading"

export default function ParentChoresLoading() {
  return (
    <Loading
      message="Chargement des tâches..."
      size="large"
      variant="spinner"
    />
  )
}

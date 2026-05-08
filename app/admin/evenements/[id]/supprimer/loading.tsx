import { Loading } from "@/components/ui/states/loading"

export default function AdminEventDeleteLoading() {
  return (
    <Loading
      context="delete"
      message="Préparation de la suppression de l'événement..."
      size="large"
      variant="spinner"
    />
  )
}

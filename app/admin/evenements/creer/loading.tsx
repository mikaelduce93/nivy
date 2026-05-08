import { Loading } from "@/components/ui/states/loading"

export default function AdminEventCreateLoading() {
  return (
    <Loading
      message="Préparation du formulaire d'événement..."
      size="large"
      variant="spinner"
    />
  )
}

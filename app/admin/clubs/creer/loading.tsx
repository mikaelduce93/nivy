import { Loading } from "@/components/ui/states/loading"

export default function AdminClubCreateLoading() {
  return (
    <Loading
      message="Préparation du formulaire de création..."
      size="large"
      variant="spinner"
    />
  )
}

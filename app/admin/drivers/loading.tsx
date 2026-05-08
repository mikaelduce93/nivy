import { Loading } from "@/components/ui/states/loading"

export default function AdminDriversLoading() {
  return (
    <Loading
      message="Chargement des chauffeurs..."
      size="large"
      variant="spinner"
    />
  )
}

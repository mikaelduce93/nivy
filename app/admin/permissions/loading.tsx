import { Loading } from "@/components/ui/states/loading"

export default function AdminPermissionsLoading() {
  return (
    <Loading
      message="Chargement des permissions..."
      size="large"
      variant="spinner"
    />
  )
}

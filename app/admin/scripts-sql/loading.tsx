import { Loading } from "@/components/ui/states/loading"

export default function AdminScriptsSqlLoading() {
  return (
    <Loading
      message="Chargement des scripts SQL..."
      size="large"
      variant="spinner"
    />
  )
}

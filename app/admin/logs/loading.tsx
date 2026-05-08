import { Loading } from "@/components/ui/states/loading"

export default function AdminLogsLoading() {
  return (
    <Loading
      message="Chargement des logs..."
      size="large"
      variant="spinner"
    />
  )
}

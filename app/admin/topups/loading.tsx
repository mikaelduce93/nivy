import { Loading } from "@/components/ui/states/loading"

export default function AdminTopupsLoading() {
  return (
    <Loading
      message="Chargement des recharges..."
      size="large"
      variant="spinner"
    />
  )
}

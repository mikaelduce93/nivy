import { Loading } from "@/components/ui/states/loading"

export default function ParentRidesLoading() {
  return (
    <Loading
      message="Chargement des trajets..."
      size="large"
      variant="spinner"
    />
  )
}

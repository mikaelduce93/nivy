import { Loading } from "@/components/ui/states/loading"

export default function ParentRideDetailLoading() {
  return (
    <Loading
      message="Chargement du trajet..."
      size="large"
      variant="spinner"
    />
  )
}

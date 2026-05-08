import { Loading } from "@/components/ui/states/loading"

export default function ParentLiveLoading() {
  return (
    <Loading
      message="Chargement du suivi en direct..."
      size="large"
      variant="spinner"
    />
  )
}

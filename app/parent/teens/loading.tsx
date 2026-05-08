import { Loading } from "@/components/ui/states/loading"

export default function ParentTeensLoading() {
  return (
    <Loading
      message="Chargement des ados..."
      size="large"
      variant="spinner"
    />
  )
}

import { Loading } from "@/components/ui/states/loading"

export default function ParentESignatureLoading() {
  return (
    <Loading
      message="Chargement de la signature électronique..."
      size="large"
      variant="spinner"
    />
  )
}

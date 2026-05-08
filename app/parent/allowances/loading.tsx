import { Loading } from "@/components/ui/states/loading"

export default function ParentAllowancesLoading() {
  return (
    <Loading
      message="Chargement des argents de poche..."
      size="large"
      variant="spinner"
    />
  )
}

import { Loading } from "@/components/ui/states/loading"

export default function ParentApprovalsLoading() {
  return (
    <Loading
      message="Chargement des approbations..."
      size="large"
      variant="spinner"
    />
  )
}

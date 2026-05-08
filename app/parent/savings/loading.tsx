import { Loading } from "@/components/ui/states/loading"

export default function ParentSavingsLoading() {
  return (
    <Loading
      message="Chargement de l'épargne..."
      size="large"
      variant="spinner"
    />
  )
}

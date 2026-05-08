import { Loading } from "@/components/ui/states/loading"

export default function ParentFoodLoading() {
  return (
    <Loading
      message="Chargement des commandes food..."
      size="large"
      variant="spinner"
    />
  )
}

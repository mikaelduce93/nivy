import { Loading } from "@/components/ui/states/loading"

export default function ParentBudgetLoading() {
  return (
    <Loading
      message="Chargement du budget..."
      size="large"
      variant="spinner"
    />
  )
}

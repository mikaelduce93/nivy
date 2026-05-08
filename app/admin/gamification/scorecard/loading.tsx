import { Loading } from "@/components/ui/states/loading"

export default function AdminGamificationScorecardLoading() {
  return (
    <Loading
      message="Chargement du scorecard..."
      size="large"
      variant="spinner"
    />
  )
}

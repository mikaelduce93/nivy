import { Loading } from "@/components/ui/states/loading"

export default function AdminGamificationSetupLoading() {
  return (
    <Loading
      message="Chargement de la configuration gamification..."
      size="large"
      variant="spinner"
    />
  )
}

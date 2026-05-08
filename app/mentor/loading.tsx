import { Loading } from "@/components/ui/states/loading"

export default function MentorLoading() {
  return (
    <Loading
      context="auth"
      message="Chargement de votre espace mentor..."
      size="large"
      variant="spinner"
    />
  )
}

import { Loading } from "@/components/ui/states/loading"

export default function MentorProfileEditLoading() {
  return (
    <Loading
      context="profile"
      message="Chargement de votre profil mentor..."
      size="large"
      variant="spinner"
    />
  )
}

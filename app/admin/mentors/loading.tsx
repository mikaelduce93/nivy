import { Loading } from "@/components/ui/states/loading"

export default function AdminMentorsLoading() {
  return (
    <Loading
      message="Chargement des mentors..."
      size="large"
      variant="spinner"
    />
  )
}

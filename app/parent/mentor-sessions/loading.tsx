import { Loading } from "@/components/ui/states/loading"

export default function ParentMentorSessionsLoading() {
  return (
    <Loading
      message="Chargement des sessions de mentorat..."
      size="large"
      variant="spinner"
    />
  )
}

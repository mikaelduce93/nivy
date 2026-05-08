import { Loading } from "@/components/ui/states/loading"

export default function MentorSessionsLoading() {
  return (
    <Loading
      message="Chargement de vos sessions..."
      size="large"
      variant="spinner"
    />
  )
}

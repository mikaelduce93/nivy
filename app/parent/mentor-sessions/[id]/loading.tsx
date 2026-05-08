import { Loading } from "@/components/ui/states/loading"

export default function ParentMentorSessionDetailLoading() {
  return (
    <Loading
      message="Chargement de la session..."
      size="large"
      variant="spinner"
    />
  )
}

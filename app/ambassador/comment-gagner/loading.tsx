import { Loading } from "@/components/ui/states/loading"

export default function AmbassadorCommentGagnerLoading() {
  return (
    <Loading
      message="Chargement du guide..."
      size="large"
      variant="spinner"
    />
  )
}

import { Loading } from "@/components/ui/states/loading"

export default function AdminCreatorModerationLoading() {
  return (
    <Loading
      message="Chargement de la modération créateurs..."
      size="large"
      variant="spinner"
    />
  )
}

import { Loading } from "@/components/ui/states/loading"

export default function AdminContentLoading() {
  return (
    <Loading
      message="Chargement du contenu..."
      size="large"
      variant="spinner"
    />
  )
}

import { Loading } from "@/components/ui/states/loading"

export default function AdminDriverDetailLoading() {
  return (
    <Loading
      message="Chargement du chauffeur..."
      size="large"
      variant="spinner"
    />
  )
}

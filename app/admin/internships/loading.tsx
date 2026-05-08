import { Loading } from "@/components/ui/states/loading"

export default function AdminInternshipsLoading() {
  return (
    <Loading
      message="Chargement des stages..."
      size="large"
      variant="spinner"
    />
  )
}

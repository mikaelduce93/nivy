import { Loading } from "@/components/ui/states/loading"

export default function AdminAnniversaireDetailLoading() {
  return (
    <Loading
      message="Chargement de l'anniversaire..."
      size="large"
      variant="spinner"
    />
  )
}

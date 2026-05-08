import { Loading } from "@/components/ui/states/loading"

export default function AdminPartnersLoading() {
  return (
    <Loading
      message="Chargement des partenaires..."
      size="large"
      variant="spinner"
    />
  )
}

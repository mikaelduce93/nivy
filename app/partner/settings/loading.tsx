import { Loading } from "@/components/ui/states/loading"

export default function PartnerSettingsLoading() {
  return (
    <Loading
      message="Chargement des paramètres..."
      size="large"
      variant="spinner"
    />
  )
}

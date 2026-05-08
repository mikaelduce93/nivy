import { Loading } from "@/components/ui/states/loading"

export default function AmbassadorCommissionsLoading() {
  return (
    <Loading
      message="Chargement des commissions..."
      size="large"
      variant="spinner"
    />
  )
}

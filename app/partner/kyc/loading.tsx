import { Loading } from "@/components/ui/states/loading"

export default function PartnerKycLoading() {
  return (
    <Loading
      message="Chargement de la vérification KYC..."
      size="large"
      variant="spinner"
    />
  )
}

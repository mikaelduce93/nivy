import { Loading } from "@/components/ui/states/loading"

export default function AdminProofsLoading() {
  return (
    <Loading
      message="Chargement des preuves..."
      size="large"
      variant="spinner"
    />
  )
}

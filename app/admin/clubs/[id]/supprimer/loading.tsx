import { Loading } from "@/components/ui/states/loading"

export default function AdminClubDeleteLoading() {
  return (
    <Loading
      context="delete"
      message="Préparation de la suppression du club..."
      size="large"
      variant="spinner"
    />
  )
}

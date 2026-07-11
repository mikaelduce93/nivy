import { Loading } from "@/components/ui/states/loading"

export default function AdminDefisSportifsLoading() {
  return (
    <Loading
      message="Chargement des défis à valider..."
      size="large"
      variant="spinner"
    />
  )
}

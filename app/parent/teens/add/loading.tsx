import { Loading } from "@/components/ui/states/loading"

export default function ParentTeenAddLoading() {
  return (
    <Loading
      message="Préparation du formulaire..."
      size="large"
      variant="spinner"
    />
  )
}

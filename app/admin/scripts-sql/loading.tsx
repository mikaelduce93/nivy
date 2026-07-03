import { Loading } from "@/components/ui/states/loading"

// #320 — This loading shell renders HTTP 200. It must never be reachable by a
// non-super-admin: the ring-fence is enforced upstream in proxy.ts (super_admin
// gate on /admin/scripts-sql) BEFORE this streams, and again by page.tsx's
// notFound(). Do not add auth-bearing content here.
export default function AdminScriptsSqlLoading() {
  return (
    <Loading
      message="Chargement des scripts SQL..."
      size="large"
      variant="spinner"
    />
  )
}

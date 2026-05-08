import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export default async function AuthErrorPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; reason?: string }>
}) {
  const params = await searchParams
  const detail = params?.error ?? params?.reason

  return (
    <div className="flex min-h-screen w-full items-center justify-center p-6 md:p-10 bg-gradient-to-br from-cyan-900 via-blue-900 to-indigo-900">
      <div className="w-full max-w-sm">
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">Erreur d&apos;authentification</CardTitle>
          </CardHeader>
          <CardContent>
            {detail ? (
              <p className="text-sm text-muted-foreground">Erreur : {detail}</p>
            ) : (
              <p className="text-sm text-muted-foreground">Une erreur inconnue est survenue.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

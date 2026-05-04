"use client"

import { useEffect } from "react"

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error("Global error:", error)
  }, [error])

  const isDev = process.env.NODE_ENV !== "production"

  return (
    <html lang="fr">
      <body>
        <div style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "1rem",
          fontFamily: "system-ui, sans-serif",
          backgroundColor: "#09090b",
          color: "#fafafa"
        }}>
          <div style={{ textAlign: "center", maxWidth: "400px" }}>
            <div style={{
              width: "64px",
              height: "64px",
              borderRadius: "50%",
              backgroundColor: "rgba(239, 68, 68, 0.1)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 1.5rem"
            }}>
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2">
                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
                <line x1="12" y1="9" x2="12" y2="13"/>
                <line x1="12" y1="17" x2="12.01" y2="17"/>
              </svg>
            </div>

            <h1 style={{ fontSize: "1.5rem", fontWeight: "bold", marginBottom: "0.5rem" }}>
              Erreur critique
            </h1>
            <p style={{ color: "#a1a1aa", marginBottom: "0.5rem" }}>
              Une erreur grave s'est produite dans l'application.
            </p>
            <p style={{ color: "#71717a", fontSize: "0.875rem", marginBottom: "1.5rem" }}>
              Veuillez rafraîchir la page. Si le problème persiste, contactez le support avec le code d'erreur ci-dessous.
            </p>

            {(isDev || error?.digest || error?.message) && (
              <div style={{
                marginBottom: "1.5rem",
                backgroundColor: "rgba(15, 23, 42, 0.6)",
                border: "1px solid rgba(148, 163, 184, 0.2)",
                borderRadius: "0.5rem",
                padding: "0.75rem",
                textAlign: "left",
                fontSize: "0.75rem",
                color: "#e2e8f0",
                whiteSpace: "pre-wrap",
                wordBreak: "break-word",
              }}>
                {error?.message && (
                  <div style={{ marginBottom: "0.5rem" }}>
                    <strong>Message:</strong> {error.message}
                  </div>
                )}
                {error?.digest && (
                  <div style={{ marginBottom: "0.5rem" }}>
                    <strong>Digest:</strong> {error.digest}
                  </div>
                )}
                {isDev && error?.stack && (
                  <div>
                    <strong>Stack:</strong> {"\n"}{error.stack}
                  </div>
                )}
              </div>
            )}

            <button
              onClick={reset}
              style={{
                backgroundColor: "#06b6d4",
                color: "white",
                padding: "0.75rem 1.5rem",
                borderRadius: "0.5rem",
                border: "none",
                cursor: "pointer",
                fontWeight: "500"
              }}
            >
              Rafraîchir la page
            </button>
          </div>
        </div>
      </body>
    </html>
  )
}

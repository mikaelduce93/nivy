'use client'

import { createContext, useContext, useEffect, useState } from 'react'

const CSRFContext = createContext<string>('')

export function CSRFProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState('')

  useEffect(() => {
    // Récupérer le token CSRF au montage
    fetch('/api/csrf')
      .then((res) => res.json())
      .then((data) => setToken(data.token))
      .catch(console.error)
  }, [])

  return <CSRFContext.Provider value={token}>{children}</CSRFContext.Provider>
}

export function useCSRF() {
  return useContext(CSRFContext)
}

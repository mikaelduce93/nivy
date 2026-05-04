"use client"

import type { ReactNode } from "react"
import React from "react"

type ClientErrorBoundaryProps = {
  children: ReactNode
  fallback?: ReactNode
}

type ClientErrorBoundaryState = {
  hasError: boolean
}

export class ClientErrorBoundary extends React.Component<ClientErrorBoundaryProps, ClientErrorBoundaryState> {
  state: ClientErrorBoundaryState = { hasError: false }

  static getDerivedStateFromError() {
    return { hasError: true }
  }

  componentDidCatch(error: unknown) {
    console.error("ClientErrorBoundary caught error:", error)
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback ?? null
    }

    return this.props.children
  }
}

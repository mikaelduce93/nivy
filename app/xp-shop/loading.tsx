import { ShoppingBag } from 'lucide-react'

export default function XpShopLoading() {
  return (
    <div className="min-h-screen bg-background py-10 px-4">
      <div className="mx-auto max-w-5xl">
        <header className="mb-8 flex items-center gap-3">
          <ShoppingBag className="h-8 w-8 text-accent-soft" />
          <div>
            <div className="h-8 w-40 animate-pulse rounded-md bg-muted" />
            <div className="mt-2 h-4 w-72 animate-pulse rounded-md bg-muted" />
          </div>
        </header>

        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <li
              key={i}
              className="rounded-3xl border border-border/40 bg-card p-5"
            >
              <div className="mb-4 aspect-video w-full animate-pulse rounded-2xl bg-muted" />
              <div className="h-5 w-3/4 animate-pulse rounded bg-muted" />
              <div className="mt-2 h-3 w-1/3 animate-pulse rounded bg-muted" />
              <div className="mt-3 h-3 w-full animate-pulse rounded bg-muted" />
              <div className="mt-2 h-3 w-5/6 animate-pulse rounded bg-muted" />
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}

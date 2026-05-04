"use client"

import { useState, useTransition, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Loader2, Coins, Heart, Sparkles, Filter, SlidersHorizontal } from "lucide-react"
import { useRouter, useSearchParams } from "next/navigation"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"

interface Category {
  id: string
  name: string
  slug: string
  icon: string
}

interface ShopFiltersProps {
  categories: Category[]
  userCoins: number
}

export function ShopFilters({ categories, userCoins }: ShopFiltersProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [isPending, startTransition] = useTransition()

  const currentCategory = searchParams.get("category") || "all"
  const onlyAffordable = searchParams.get("affordable") === "true"
  const onlyNew = searchParams.get("new") === "true"
  const onlyWishlist = searchParams.get("wishlist") === "true"

  const updateFilters = (updates: Record<string, string | null>) => {
    startTransition(() => {
      const params = new URLSearchParams(searchParams.toString())

      Object.entries(updates).forEach(([key, value]) => {
        if (value === null || value === "all" || value === "false") {
          params.delete(key)
        } else {
          params.set(key, value)
        }
      })

      const queryString = params.toString()
      router.push(`/teen/shop${queryString ? `?${queryString}` : ""}`, { scroll: false })
    })
  }

  const setCategory = (slug: string) => {
    updateFilters({ category: slug === "all" ? null : slug })
  }

  const toggleAffordable = () => {
    updateFilters({ affordable: onlyAffordable ? null : "true" })
  }

  const toggleNew = () => {
    updateFilters({ new: onlyNew ? null : "true" })
  }

  const toggleWishlist = () => {
    updateFilters({ wishlist: onlyWishlist ? null : "true" })
  }

  const clearFilters = () => {
    startTransition(() => {
      router.push("/teen/shop", { scroll: false })
    })
  }

  const hasActiveFilters = currentCategory !== "all" || onlyAffordable || onlyNew || onlyWishlist

  return (
    <div className="space-y-4 mb-8">
      {/* Category Pills */}
      <div className="flex gap-3 overflow-x-auto pb-2">
        <Button
          variant="outline"
          onClick={() => setCategory("all")}
          disabled={isPending}
          className={`whitespace-nowrap ${
            currentCategory === "all"
              ? "border-primary text-primary bg-primary/10 hover:bg-primary/20"
              : "border-border text-muted-foreground hover:border-muted-foreground/40"
          }`}
        >
          {isPending && currentCategory === "all" ? (
            <Loader2 className="h-4 w-4 mr-1 animate-spin" />
          ) : null}
          Tout
        </Button>
        {categories.map((cat) => (
          <Button
            key={cat.id}
            variant="outline"
            onClick={() => setCategory(cat.slug)}
            disabled={isPending}
            className={`whitespace-nowrap ${
              currentCategory === cat.slug
                ? "border-primary text-primary bg-primary/10 hover:bg-primary/20"
                : "border-border text-muted-foreground hover:border-muted-foreground/40"
            }`}
          >
            {isPending && currentCategory === cat.slug ? (
              <Loader2 className="h-4 w-4 mr-1 animate-spin" />
            ) : (
              <span className="mr-1">{cat.icon}</span>
            )}
            {cat.name}
          </Button>
        ))}
      </div>

      {/* Quick Filter Pills */}
      <div className="flex flex-wrap items-center gap-3">
        <Button
          variant="outline"
          size="sm"
          onClick={toggleAffordable}
          disabled={isPending}
          className={`${
            onlyAffordable
              ? "border-success text-success bg-success/10"
              : "border-border text-muted-foreground hover:border-muted-foreground/40"
          }`}
        >
          <Coins className="h-3.5 w-3.5 mr-1.5" />
          Accessible ({userCoins} coins)
        </Button>

        <Button
          variant="outline"
          size="sm"
          onClick={toggleNew}
          disabled={isPending}
          className={`${
            onlyNew
              ? "border-primary text-primary bg-primary/10"
              : "border-border text-muted-foreground hover:border-muted-foreground/40"
          }`}
        >
          <Sparkles className="h-3.5 w-3.5 mr-1.5" />
          Nouveautés
        </Button>

        <Button
          variant="outline"
          size="sm"
          onClick={toggleWishlist}
          disabled={isPending}
          className={`${
            onlyWishlist
              ? "border-destructive text-destructive bg-destructive/10"
              : "border-border text-muted-foreground hover:border-muted-foreground/40"
          }`}
        >
          <Heart className={`h-3.5 w-3.5 mr-1.5 ${onlyWishlist ? "fill-destructive" : ""}`} />
          Wishlist
        </Button>

        {hasActiveFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={clearFilters}
            disabled={isPending}
            className="text-muted-foreground hover:text-foreground"
          >
            Effacer filtres
          </Button>
        )}

        {/* Mobile Filters Sheet */}
        <Sheet>
          <SheetTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className="ml-auto border-border text-muted-foreground md:hidden"
            >
              <SlidersHorizontal className="h-4 w-4 mr-1" />
              Filtres
            </Button>
          </SheetTrigger>
          <SheetContent side="bottom" className="bg-card border-border">
            <SheetHeader>
              <SheetTitle className="text-foreground">Filtres</SheetTitle>
            </SheetHeader>
            <div className="space-y-6 py-4">
              <div className="flex items-center justify-between">
                <Label className="text-foreground flex items-center gap-2">
                  <Coins className="h-4 w-4 text-success" />
                  Accessible uniquement
                </Label>
                <Switch
                  checked={onlyAffordable}
                  onCheckedChange={toggleAffordable}
                  className="data-[state=checked]:bg-success"
                />
              </div>
              <div className="flex items-center justify-between">
                <Label className="text-foreground flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-primary" />
                  Nouveautés uniquement
                </Label>
                <Switch
                  checked={onlyNew}
                  onCheckedChange={toggleNew}
                  className="data-[state=checked]:bg-primary"
                />
              </div>
              <div className="flex items-center justify-between">
                <Label className="text-foreground flex items-center gap-2">
                  <Heart className="h-4 w-4 text-destructive" />
                  Ma wishlist
                </Label>
                <Switch
                  checked={onlyWishlist}
                  onCheckedChange={toggleWishlist}
                  className="data-[state=checked]:bg-destructive"
                />
              </div>
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </div>
  )
}

"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { Home, Users, FileCheck, Wallet, Settings } from "lucide-react"
import { cn } from "@/lib/utils"

interface NavItem {
  label: string
  href: string
  icon: typeof Home
  color: string
  glowColor: string
  badge?: number
}

export function ParentMobileDock({ pendingCount = 0 }: { pendingCount?: number }) {
  const pathname = usePathname()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  // 5-PILLAR PARENT NAVIGATION: Home, Teens, Approvals, Budget, Settings
  const navItems: NavItem[] = [
    {
      label: "Home",
      href: "/parent",
      icon: Home,
      color: "#2dd4bf", // teal
      glowColor: "rgba(45, 212, 191, 0.5)",
    },
    {
      label: "Teens",
      href: "/parent/teens",
      icon: Users,
      color: "#c4b5fd", // lavender
      glowColor: "rgba(196, 181, 253, 0.5)",
    },
    {
      label: "Approvals",
      href: "/parent/approvals",
      icon: FileCheck,
      color: "#fda4af", // coral/rose
      glowColor: "rgba(253, 164, 175, 0.5)",
      badge: pendingCount > 0 ? pendingCount : undefined,
    },
    {
      label: "Budget",
      href: "/parent/budget",
      icon: Wallet,
      color: "#fde047", // yellow
      glowColor: "rgba(253, 224, 71, 0.5)",
    },
    {
      label: "Settings",
      href: "/parent/settings",
      icon: Settings,
      color: "#a1a1aa", // zinc
      glowColor: "rgba(161, 161, 170, 0.5)",
    },
  ]

  if (!mounted) {
    return (
      <nav
        className="fixed bottom-0 left-0 right-0 z-50 p-3 md:hidden"
        style={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          zIndex: 50,
          padding: '12px',
        }}
        role="navigation"
        aria-label="Navigation mobile parent"
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-around',
            alignItems: 'center',
            padding: '8px',
            borderRadius: '24px',
            backgroundColor: 'rgba(24, 24, 27, 0.95)',
            backdropFilter: 'blur(24px)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
          }}
        >
          {navItems.map((item) => {
            const Icon = item.icon
            return (
              <Link
                key={item.href}
                href={item.href}
                style={{
                  flex: 1,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '2px',
                  padding: '8px 0',
                  textDecoration: 'none',
                }}
              >
                <Icon style={{ width: '24px', height: '24px', color: '#71717a' }} />
                <span style={{ fontSize: '10px', color: '#71717a', fontWeight: 600 }}>
                  {item.label}
                </span>
              </Link>
            )
          })}
        </div>
      </nav>
    )
  }

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 p-3 md:hidden"
      role="navigation"
      aria-label="Navigation mobile parent"
    >
      {/* Blur backdrop */}
      <div 
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'linear-gradient(to top, rgba(0,0,0,0.9), rgba(0,0,0,0.5), transparent)',
        }}
      />
      
      <div 
        className="relative rounded-3xl p-2 flex justify-around items-center shadow-2xl"
        style={{
          backgroundColor: 'rgba(24, 24, 27, 0.95)',
          backdropFilter: 'blur(24px)',
          WebkitBackdropFilter: 'blur(24px)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
        }}
      >
        {navItems.map((item) => {
          const Icon = item.icon
          const isActive = pathname === item.href || (item.href !== "/parent" && pathname?.startsWith(item.href))

          return (
            <Link
              key={item.href}
              href={item.href}
              aria-label={item.label}
              aria-current={isActive ? "page" : undefined}
              className="relative z-10 flex-1"
            >
              <div
                className={cn(
                  "flex flex-col items-center gap-0.5 py-2 rounded-xl transition-all duration-200",
                  isActive ? "" : "hover:bg-white/5"
                )}
                style={{
                  background: isActive 
                    ? `linear-gradient(to top, ${item.glowColor.replace('0.5', '0.15')}, transparent)` 
                    : 'transparent',
                }}
              >
                {/* Icon container */}
                <div className="relative">
                  <Icon
                    style={{
                      width: '24px',
                      height: '24px',
                      color: isActive ? item.color : '#71717a',
                      filter: isActive ? `drop-shadow(0 0 8px ${item.glowColor})` : 'none',
                      transition: 'all 0.3s ease',
                      transform: isActive ? 'scale(1.1)' : 'scale(1)',
                    }}
                  />

                  {/* Badge */}
                  {item.badge !== undefined && item.badge > 0 && (
                    <div
                      style={{
                        position: 'absolute',
                        top: '-6px',
                        right: '-8px',
                        minWidth: '18px',
                        height: '18px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: '0 4px',
                        borderRadius: '9999px',
                        backgroundColor: '#ef4444',
                        color: 'white',
                        fontSize: '10px',
                        fontWeight: 'bold',
                        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                      }}
                    >
                      {item.badge > 9 ? '9+' : item.badge}
                    </div>
                  )}
                </div>

                {/* Label */}
                <span
                  style={{
                    fontSize: '10px',
                    fontWeight: 600,
                    color: isActive ? 'white' : '#52525b',
                    transition: 'all 0.3s ease',
                  }}
                >
                  {item.label}
                </span>

                {/* Active dot indicator */}
                {isActive && (
                  <div
                    style={{
                      width: '4px',
                      height: '4px',
                      borderRadius: '9999px',
                      marginTop: '2px',
                      backgroundColor: item.color,
                      boxShadow: `0 0 8px ${item.glowColor}`,
                    }}
                  />
                )}
              </div>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}

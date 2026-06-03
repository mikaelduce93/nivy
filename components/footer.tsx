"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Facebook, Instagram, Twitter, Mail, MapPin } from 'lucide-react'
import { getPublicAppConfig, getEscrowConfig } from "@/lib/config/app-config"
import { PandaLogo } from "@/components/brand/panda-logo"
import { LocaleSwitcher } from "@/components/locale-switcher"
import { useT } from "@/lib/i18n"

const { contactEmail: CONTACT_EMAIL } = getPublicAppConfig()
// #289 — affirmation d'escrow depuis la source unique (conditionnelle tant que
// le tiers e-money n'est pas nommé), jamais en dur.
const { short: ESCROW_SHORT } = getEscrowConfig()

type FooterLink = { label: string; href: string }
type FooterColumn = { title: string; links: FooterLink[] }

const COLUMNS: FooterColumn[] = [
  {
    title: "Explorer",
    links: [
      { label: "Clubs", href: "/clubs" },
      { label: "Agenda", href: "/agenda" },
      { label: "Anniversaires", href: "/anniversaires" },
      { label: "Galerie", href: "/galerie" },
      { label: "Carte VIP", href: "/carte-vip" },
    ],
  },
  {
    title: "Confiance",
    links: [
      { label: "Sécurité", href: "/securite" },
      { label: "Guide parents", href: "/guide-parents" },
      { label: "FAQ", href: "/aide/faq" },
      { label: "À propos", href: "/a-propos" },
    ],
  },
  {
    title: "Collabore",
    links: [
      { label: "Vous êtes un commerce ?", href: "/partenaires" },
      { label: "Devenir partenaire", href: "/devenir-partenaire" },
      { label: "Ambassadeur", href: "/devenir-ambassadeur" },
      { label: "Influenceur", href: "/devenir-influenceur" },
      { label: "Coach", href: "/devenir-coach" },
    ],
  },
  {
    title: "Aide",
    links: [
      { label: "Centre d'aide", href: "/aide" },
      { label: "Préférences notifs", href: "/notifications/preferences" },
      { label: "Mes données", href: "/account/export" },
    ],
  },
]

export function Footer() {
  const pathname = usePathname()
  const isHome = pathname === "/"
  const t = useT()

  return (
    <footer className="bg-card border-t border-border">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-8 mb-8">
          {/* Brand */}
          <div className="lg:col-span-2">
            <div className="flex items-center gap-2 mb-4 text-foreground">
              <PandaLogo variant="full" size="md" />
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed mb-4">
              Le hub lifestyle gamifié des 13–17 ans au Maroc : sport &amp; clubs, études, création, sorties &amp; crew.
              {!isHome && (
                <>
                  {" "}
                  Les ados gagnent en autonomie, les parents gardent le contrôle, les partenaires fidélisent une vraie clientèle. Coins prépayés en dirhams ({ESCROW_SHORT}), données protégées (CNDP, loi 09-08).
                </>
              )}
            </p>

            {/* Social Links — TODO(refonte): remplacer href="#" par les vraies URLs sociales NIVY */}
            <div className="flex items-center gap-3">
              <Link
                href="#"
                className="w-9 h-9 rounded-lg bg-muted hover:bg-primary transition-colors flex items-center justify-center text-muted-foreground hover:text-primary-foreground"
                aria-label="Facebook"
              >
                <Facebook className="w-4 h-4" />
              </Link>
              <Link
                href="#"
                className="w-9 h-9 rounded-lg bg-muted hover:bg-accent transition-colors flex items-center justify-center text-muted-foreground hover:text-accent-foreground"
                aria-label="Instagram"
              >
                <Instagram className="w-4 h-4" />
              </Link>
              <Link
                href="#"
                className="w-9 h-9 rounded-lg bg-muted hover:bg-chart-4 transition-colors flex items-center justify-center text-muted-foreground hover:text-primary-foreground"
                aria-label="Twitter"
              >
                <Twitter className="w-4 h-4" />
              </Link>
            </div>
          </div>

          {/* Navigation columns (lifestyle-first taxonomy) */}
          {COLUMNS.map((column) => (
            <div key={column.title}>
              <h3 className="font-semibold mb-4 text-foreground">{column.title}</h3>
              <ul className="space-y-2">
                {column.links.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="text-sm text-muted-foreground hover:text-primary transition-colors"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Contact strip */}
        <div className="pt-6 border-t border-border flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-8 mb-2">
          <span className="flex items-center gap-2 text-sm text-muted-foreground">
            <MapPin className="w-4 h-4 text-primary flex-shrink-0" />
            Casablanca, Rabat, Marrakech
          </span>
          <a
            href={`mailto:${CONTACT_EMAIL}`}
            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors"
          >
            <Mail className="w-4 h-4 text-accent flex-shrink-0" />
            {CONTACT_EMAIL}
          </a>
        </div>

        {/* Bottom Bar */}
        <div className="pt-6 border-t border-border flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-sm text-muted-foreground/70">
            {t("footer.copyright")}
          </p>
          <div className="flex items-center gap-6 flex-wrap justify-center">
            <Link href="/legal/mentions-legales" className="text-sm text-muted-foreground hover:text-primary transition-colors">
              {t("footer.linkLegalNotice")}
            </Link>
            <Link href="/legal/confidentialite" className="text-sm text-muted-foreground hover:text-primary transition-colors">
              {t("footer.linkPrivacy")}
            </Link>
            <Link href="/legal/cgu" className="text-sm text-muted-foreground hover:text-primary transition-colors">
              {t("footer.linkTos")}
            </Link>
            {/* i18n: locale switcher mounted in footer for discoverability. */}
            <LocaleSwitcher variant="full" />
          </div>
        </div>
      </div>
    </footer>
  )
}

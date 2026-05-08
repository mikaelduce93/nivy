"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Facebook, Instagram, Twitter, Mail, Phone, MapPin, Shield, Users, HelpCircle, Info, MessageSquare, Handshake } from 'lucide-react'
import { getPublicAppConfig } from "@/lib/config/app-config"
import { PandaLogo } from "@/components/brand/panda-logo"
import { LocaleSwitcher } from "@/components/locale-switcher"
import { useT } from "@/lib/i18n"

const { contactEmail: CONTACT_EMAIL } = getPublicAppConfig()

export function Footer() {
  const pathname = usePathname()
  const isHome = pathname === "/"
  const t = useT()

  if (isHome) {
    return (
      <footer className="bg-card border-t border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
            {/* Brand */}
            <div>
              <div className="flex items-center gap-2 mb-4 text-foreground">
                <PandaLogo variant="full" size="md" />
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed mb-4">
                {t("footer.tagline")}
              </p>

              {/* Social Links */}
              <div className="flex items-center gap-3">
                <Link
                  href="https://facebook.com/teenspartymorocco"
                  target="_blank"
                  className="w-9 h-9 rounded-lg bg-muted hover:bg-primary transition-colors flex items-center justify-center text-muted-foreground hover:text-primary-foreground"
                  aria-label="Facebook"
                >
                  <Facebook className="w-4 h-4" />
                </Link>
                <Link
                  href="https://instagram.com/teenspartymorocco"
                  target="_blank"
                  className="w-9 h-9 rounded-lg bg-muted hover:bg-accent transition-colors flex items-center justify-center text-muted-foreground hover:text-accent-foreground"
                  aria-label="Instagram"
                >
                  <Instagram className="w-4 h-4" />
                </Link>
                <Link
                  href="https://twitter.com/teenspartyma"
                  target="_blank"
                  className="w-9 h-9 rounded-lg bg-muted hover:bg-chart-4 transition-colors flex items-center justify-center text-muted-foreground hover:text-primary-foreground"
                  aria-label="Twitter"
                >
                  <Twitter className="w-4 h-4" />
                </Link>
                <Link
                  href="https://wa.me/212661234567"
                  target="_blank"
                  className="w-9 h-9 rounded-lg bg-muted hover:bg-success transition-colors flex items-center justify-center text-muted-foreground hover:text-success-foreground"
                  aria-label="WhatsApp"
                >
                  <MessageSquare className="w-4 h-4" />
                </Link>
              </div>
            </div>

            {/* Essentiels */}
            <div>
              <h3 className="font-semibold mb-4 text-foreground">{t("footer.essentials")}</h3>
              <ul className="space-y-2">
                <li>
                  <Link href="/agenda" className="text-sm text-muted-foreground hover:text-primary transition-colors">
                    Agenda
                  </Link>
                </li>
                <li>
                  <Link href="/clubs" className="text-sm text-muted-foreground hover:text-primary transition-colors">
                    Clubs
                  </Link>
                </li>
                <li>
                  <Link href="/securite" className="text-sm text-muted-foreground hover:text-primary transition-colors">
                    Sécurité
                  </Link>
                </li>
                <li>
                  <Link href="/guide-parents" className="text-sm text-muted-foreground hover:text-primary transition-colors">
                    Guide Parents
                  </Link>
                </li>
                <li>
                  <Link href="/aide/faq" className="text-sm text-muted-foreground hover:text-primary transition-colors">
                    FAQ
                  </Link>
                </li>
              </ul>
            </div>

            {/* Contact */}
            <div>
              <h3 className="font-semibold mb-4 text-foreground">{t("footer.contact")}</h3>
              <ul className="space-y-3">
                <li className="flex items-start gap-2 text-sm text-muted-foreground">
                  <MapPin className="w-4 h-4 mt-0.5 text-primary flex-shrink-0" />
                  <span>Casablanca, Rabat, Marrakech</span>
                </li>
                <li className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Phone className="w-4 h-4 text-chart-4 flex-shrink-0" />
                  <a href="tel:+212661234567" className="hover:text-primary transition-colors">
                    +212 661 234 567
                  </a>
                </li>
                <li className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Mail className="w-4 h-4 text-accent flex-shrink-0" />
                  <a href={`mailto:${CONTACT_EMAIL}`} className="hover:text-primary transition-colors">
                    {CONTACT_EMAIL}
                  </a>
                </li>
                <li className="flex items-center gap-2 text-sm text-muted-foreground">
                  <MessageSquare className="w-4 h-4 text-success flex-shrink-0" />
                  <a href="https://wa.me/212661234567" target="_blank" rel="noopener noreferrer" className="hover:text-primary transition-colors">
                    {t("footer.whatsappSupport")}
                  </a>
                </li>
              </ul>
            </div>
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
              Les soirées pour ados les plus sécurisées et inoubliables du Maroc. 100% sans alcool, encadrement professionnel, pour les 13–17 ans.
            </p>

            {/* Social Links */}
            <div className="flex items-center gap-3 mb-4">
              <Link
                href="https://facebook.com/teenspartymorocco"
                target="_blank"
                className="w-9 h-9 rounded-lg bg-muted hover:bg-primary transition-colors flex items-center justify-center text-muted-foreground hover:text-primary-foreground"
                aria-label="Facebook"
              >
                <Facebook className="w-4 h-4" />
              </Link>
              <Link
                href="https://instagram.com/teenspartymorocco"
                target="_blank"
                className="w-9 h-9 rounded-lg bg-muted hover:bg-accent transition-colors flex items-center justify-center text-muted-foreground hover:text-accent-foreground"
                aria-label="Instagram"
              >
                <Instagram className="w-4 h-4" />
              </Link>
              <Link
                href="https://twitter.com/teenspartyma"
                target="_blank"
                className="w-9 h-9 rounded-lg bg-muted hover:bg-chart-4 transition-colors flex items-center justify-center text-muted-foreground hover:text-primary-foreground"
                aria-label="Twitter"
              >
                <Twitter className="w-4 h-4" />
              </Link>
              <Link
                href="https://wa.me/212661234567"
                target="_blank"
                className="w-9 h-9 rounded-lg bg-muted hover:bg-success transition-colors flex items-center justify-center text-muted-foreground hover:text-success-foreground"
                aria-label="WhatsApp"
              >
                <MessageSquare className="w-4 h-4" />
              </Link>
            </div>

            {/* Trust Badges */}
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-3 py-1 rounded-full bg-success/10 text-success text-xs font-semibold border border-success/20">
                ✓ 100% Sans Alcool
              </span>
              <span className="px-3 py-1 rounded-full bg-info/10 text-info text-xs font-semibold border border-info/20">
                ✓ Encadrement Pro
              </span>
              <span className="px-3 py-1 rounded-full bg-accent/10 text-accent text-xs font-semibold border border-accent/20">
                ✓ 13–17 ans
              </span>
            </div>
          </div>

          {/* Navigation */}
          <div>
            <h3 className="font-semibold mb-4 text-foreground">Navigation</h3>
            <ul className="space-y-2">
              <li>
                <Link href="/agenda" className="text-sm text-muted-foreground hover:text-primary transition-colors">
                  Agenda
                </Link>
              </li>
              <li>
                <Link href="/anniversaires" className="text-sm text-muted-foreground hover:text-primary transition-colors">
                  Anniversaires
                </Link>
              </li>
              <li>
                <Link href="/clubs" className="text-sm text-muted-foreground hover:text-primary transition-colors">
                  Clubs
                </Link>
              </li>
              <li>
                <Link href="/gamification" className="text-sm text-muted-foreground hover:text-primary transition-colors">
                  Level Up
                </Link>
              </li>
              <li>
                <Link href="/carte-vip" className="text-sm text-muted-foreground hover:text-primary transition-colors">
                  Carte VIP
                </Link>
              </li>
            </ul>
          </div>

          {/* Information */}
          <div>
            <h3 className="font-semibold mb-4 text-foreground flex items-center gap-2">
              <Info className="w-4 h-4 text-primary" />
              Information
            </h3>
            <ul className="space-y-2">
              <li>
                <Link href="/securite" className="text-sm text-muted-foreground hover:text-primary transition-colors flex items-center gap-2">
                  <Shield className="w-3 h-3" />
                  Sécurité
                </Link>
              </li>
              <li>
                <Link href="/guide-parents" className="text-sm text-muted-foreground hover:text-primary transition-colors flex items-center gap-2">
                  <Users className="w-3 h-3" />
                  Guide Parents
                </Link>
              </li>
              <li>
                <Link href="/aide/faq" className="text-sm text-muted-foreground hover:text-primary transition-colors flex items-center gap-2">
                  <HelpCircle className="w-3 h-3" />
                  FAQ
                </Link>
              </li>
              <li>
                <Link href="/aide" className="text-sm text-muted-foreground hover:text-primary transition-colors">
                  Centre d'aide
                </Link>
              </li>
              <li>
                <Link href="/a-propos" className="text-sm text-muted-foreground hover:text-primary transition-colors flex items-center gap-2">
                  <Info className="w-3 h-3" />
                  À propos
                </Link>
              </li>
            </ul>
          </div>

          {/* Opportunités */}
          <div>
            <h3 className="font-semibold mb-4 text-foreground flex items-center gap-2">
              <Handshake className="w-4 h-4 text-accent" />
              Opportunités
            </h3>
            <ul className="space-y-2">
              <li>
                <Link href="/devenir-ambassadeur" className="text-sm text-muted-foreground hover:text-primary transition-colors">
                  Devenir Ambassadeur
                </Link>
              </li>
              <li>
                <Link href="/devenir-partenaire" className="text-sm text-muted-foreground hover:text-primary transition-colors">
                  Devenir Partenaire
                </Link>
              </li>
              <li>
                <Link href="/devenir-influenceur" className="text-sm text-muted-foreground hover:text-primary transition-colors">
                  Devenir Influenceur
                </Link>
              </li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h3 className="font-semibold mb-4 text-foreground">Contact</h3>
            <ul className="space-y-3">
              <li className="flex items-start gap-2 text-sm text-muted-foreground">
                <MapPin className="w-4 h-4 mt-0.5 text-primary flex-shrink-0" />
                <span>Casablanca, Rabat, Marrakech</span>
              </li>
              <li className="flex items-center gap-2 text-sm text-muted-foreground">
                <Phone className="w-4 h-4 text-chart-4 flex-shrink-0" />
                <a href="tel:+212661234567" className="hover:text-primary transition-colors">
                  +212 661 234 567
                </a>
              </li>
              <li className="flex items-center gap-2 text-sm text-muted-foreground">
                <Mail className="w-4 h-4 text-accent flex-shrink-0" />
                <a href={`mailto:${CONTACT_EMAIL}`} className="hover:text-primary transition-colors">
                  {CONTACT_EMAIL}
                </a>
              </li>
              <li className="flex items-center gap-2 text-sm text-muted-foreground">
                <MessageSquare className="w-4 h-4 text-success flex-shrink-0" />
                <a href="https://wa.me/212661234567" target="_blank" rel="noopener noreferrer" className="hover:text-primary transition-colors">
                  WhatsApp Support
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="pt-8 border-t border-border flex flex-col md:flex-row items-center justify-between gap-4">
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
            <Link href="/aide/faq" className="text-sm text-muted-foreground hover:text-primary transition-colors">
              {t("footer.linkFaq")}
            </Link>
            {/* i18n: locale switcher (mirrors home footer placement). */}
            <LocaleSwitcher variant="full" />
          </div>
        </div>
      </div>
    </footer>
  )
}

# Teens Party Morocco - Design System v2.0

> Guide complet des tokens, composants et patterns UI pour maintenir la cohérence visuelle.

## Table des Matières

1. [Principes de Design](#principes-de-design)
2. [Couleurs](#couleurs)
3. [Typographie](#typographie)
4. [Spacing](#spacing)
5. [Border Radius](#border-radius)
6. [Shadows & Elevation](#shadows--elevation)
7. [Z-Index](#z-index)
8. [Animations](#animations)
9. [Composants UI](#composants-ui)
10. [Classes Utilitaires](#classes-utilitaires)
11. [Accessibilité](#accessibilité)
12. [Exemples d'Utilisation](#exemples-dutilisation)

---

## Principes de Design

### Identité Visuelle
- **Moderne & Énergique** : Refléter l'énergie des adolescents
- **Sécurisant** : Inspirer confiance aux parents
- **Accessible** : Lisible et utilisable par tous
- **Cohérent** : Uniformité à travers toutes les pages

### Philosophie
```
Primary (Emerald/Teal) → Confiance, Jeunesse, Énergie positive
Accent (Coral/Peach)   → Fun, Chaleur, Excitement
Dark Mode First        → Expérience immersive, moderne
```

---

## Couleurs

### Palette Principale

| Token | Light Mode | Dark Mode | Usage |
|-------|------------|-----------|-------|
| `--primary` | `oklch(0.55 0.18 165)` | `oklch(0.65 0.18 165)` | Boutons principaux, liens, CTAs |
| `--accent` | `oklch(0.65 0.16 35)` | `oklch(0.72 0.16 35)` | Highlights, badges, promotions |
| `--secondary` | `oklch(0.96 0.005 260)` | `oklch(0.15 0.015 260)` | Boutons secondaires, fonds alternatifs |

### Couleurs Sémantiques

| Token | Usage | Exemple |
|-------|-------|---------|
| `--success` | Validation, confirmation | Paiement réussi, inscription validée |
| `--warning` | Attention, avertissement | Places limitées, délai proche |
| `--info` | Information, aide | Tooltips, messages d'info |
| `--destructive` | Erreur, suppression | Annulation, erreur de formulaire |

### Couleurs de Surface

| Token | Usage |
|-------|-------|
| `--background` | Fond de page principal |
| `--card` | Cartes, panneaux élevés |
| `--popover` | Menus déroulants, tooltips |
| `--muted` | Fonds subtils, sections désactivées |

### Utilisation en Tailwind

```tsx
// Couleurs de fond
<div className="bg-background" />
<div className="bg-card" />
<div className="bg-primary" />

// Couleurs de texte
<p className="text-foreground" />
<p className="text-muted-foreground" />
<p className="text-primary" />

// Avec opacité
<div className="bg-primary/20" />
<div className="text-foreground/80" />

// Bordures
<div className="border border-border" />
<div className="border-primary" />
```

### Palette de Données (Charts)

```
--chart-1: Emerald/Teal (principal)
--chart-2: Coral (accent)
--chart-3: Purple
--chart-4: Blue
--chart-5: Yellow
```

---

## Typographie

### Police de Caractères

| Variable | Valeur | Usage |
|----------|--------|-------|
| `--font-sans` | Geist, system-ui | Texte principal |
| `--font-mono` | Geist Mono | Code, données techniques |

### Échelle de Tailles

| Token | Taille | Utilisation |
|-------|--------|-------------|
| `--text-xs` | 12px | Labels, badges, métadonnées |
| `--text-sm` | 14px | Texte secondaire, descriptions |
| `--text-base` | 16px | Texte de paragraphe (défaut) |
| `--text-lg` | 18px | Texte important, intro |
| `--text-xl` | 20px | Sous-titres |
| `--text-2xl` | 24px | Titres de section |
| `--text-3xl` | 30px | Titres de page |
| `--text-4xl` | 36px | Titres hero |
| `--text-5xl` | 48px | Titres d'impact |
| `--text-6xl` | 60px | Titres marketing |

### Graisses (Font Weights)

| Token | Valeur | Usage |
|-------|--------|-------|
| `--font-normal` | 400 | Texte courant |
| `--font-medium` | 500 | Texte légèrement appuyé |
| `--font-semibold` | 600 | Sous-titres, labels importants |
| `--font-bold` | 700 | Titres, CTAs |

### Hauteurs de Ligne

| Token | Valeur | Usage |
|-------|--------|-------|
| `--leading-tight` | 1.25 | Titres |
| `--leading-snug` | 1.375 | Sous-titres |
| `--leading-normal` | 1.5 | Texte de paragraphe |
| `--leading-relaxed` | 1.625 | Texte long, articles |

### Exemples Tailwind

```tsx
// Titre hero
<h1 className="text-4xl md:text-5xl font-bold leading-tight">
  Teens Party Morocco
</h1>

// Sous-titre
<h2 className="text-2xl font-semibold leading-snug">
  Nos Événements
</h2>

// Paragraphe
<p className="text-base leading-relaxed text-muted-foreground">
  Description de l'événement...
</p>

// Label
<span className="text-sm font-medium">
  Places disponibles
</span>
```

---

## Spacing

### Échelle de Base (4px)

| Token | Valeur | Pixels | Usage courant |
|-------|--------|--------|---------------|
| `--space-1` | 0.25rem | 4px | Marges entre icônes et texte |
| `--space-2` | 0.5rem | 8px | Padding boutons compact |
| `--space-3` | 0.75rem | 12px | Gap entre éléments proches |
| `--space-4` | 1rem | 16px | Padding standard, gap de grille |
| `--space-6` | 1.5rem | 24px | Sections internes |
| `--space-8` | 2rem | 32px | Séparation de sections |
| `--space-12` | 3rem | 48px | Grandes sections |
| `--space-16` | 4rem | 64px | Hero padding |
| `--space-24` | 6rem | 96px | Section majeure |

### Règles d'Utilisation

```
Composants internes : 4px, 8px, 12px
Entre composants   : 16px, 24px
Entre sections     : 32px, 48px, 64px
Hero/Marketing     : 64px, 96px, 128px
```

### Exemples Tailwind

```tsx
// Card avec padding
<div className="p-4 md:p-6">

// Gap de grille
<div className="grid gap-4 md:gap-6">

// Espacement vertical de section
<section className="py-16 md:py-24">

// Bouton avec espacement interne
<button className="px-4 py-2 gap-2">
```

---

## Border Radius

### Échelle

| Token | Valeur | Usage |
|-------|--------|-------|
| `--radius-none` | 0 | Éléments carrés |
| `--radius-sm` | 4px | Badges, tags, inputs petits |
| `--radius-md` | 8px | Boutons, inputs |
| `--radius-lg` | 12px | Cards, modals (défaut) |
| `--radius-xl` | 16px | Cards larges, hero sections |
| `--radius-2xl` | 24px | Sections marketing |
| `--radius-full` | 9999px | Avatars, pills, badges ronds |

### Exemples Tailwind

```tsx
// Bouton standard
<button className="rounded-md">

// Card
<div className="rounded-lg">

// Avatar
<img className="rounded-full">

// Badge
<span className="rounded-full px-3 py-1">
```

---

## Shadows & Elevation

### Niveaux d'Élévation

| Token | Utilisation |
|-------|-------------|
| `--shadow-xs` | Boutons au repos, inputs |
| `--shadow-sm` | Cards, éléments élevés |
| `--shadow-md` | Dropdowns, menus |
| `--shadow-lg` | Modals, dialogues |
| `--shadow-xl` | Popovers, tooltips complexes |
| `--shadow-2xl` | Hero cards, éléments flottants |

### Shadows en Dark Mode

Les shadows sont automatiquement ajustées en dark mode avec plus d'opacité pour rester visibles sur fond sombre.

### Exemples Tailwind

```tsx
// Card standard
<div className="shadow-sm hover:shadow-md transition-shadow">

// Modal
<div className="shadow-lg">

// Element hero avec glow
<div className="shadow-2xl glow-lg">
```

---

## Z-Index

### Échelle Sémantique

| Token | Valeur | Usage |
|-------|--------|-------|
| `--z-0` | 0 | Éléments de base |
| `--z-10` | 10 | Éléments légèrement élevés |
| `--z-dropdown` | 100 | Menus déroulants |
| `--z-sticky` | 200 | Headers sticky |
| `--z-fixed` | 300 | Éléments fixes (navbar) |
| `--z-modal-backdrop` | 400 | Overlay de modal |
| `--z-modal` | 500 | Contenu de modal |
| `--z-popover` | 600 | Popovers |
| `--z-tooltip` | 700 | Tooltips |
| `--z-toast` | 800 | Notifications toast |
| `--z-max` | 9999 | Éléments critiques |

### Règle d'Or

```
Toujours utiliser les tokens sémantiques plutôt que des valeurs arbitraires.
❌ z-[999]
✅ z-modal ou style={{ zIndex: 'var(--z-modal)' }}
```

---

## Animations

### Durées

| Token | Valeur | Usage |
|-------|--------|-------|
| `--duration-fast` | 100ms | Hover, focus rapides |
| `--duration-normal` | 200ms | Transitions standard |
| `--duration-moderate` | 300ms | Ouverture de menus |
| `--duration-slow` | 500ms | Animations d'entrée |
| `--duration-slower` | 700ms | Animations complexes |

### Easings

| Token | Courbe | Usage |
|-------|--------|-------|
| `--ease-out` | cubic-bezier(0, 0, 0.2, 1) | Entrées (apparitions) |
| `--ease-in` | cubic-bezier(0.4, 0, 1, 1) | Sorties (disparitions) |
| `--ease-in-out` | cubic-bezier(0.4, 0, 0.2, 1) | Transitions continues |
| `--ease-bounce` | cubic-bezier(0.68, -0.55, 0.265, 1.55) | Effet rebond |
| `--ease-spring` | cubic-bezier(0.175, 0.885, 0.32, 1.275) | Effet ressort |

### Classes d'Animation

| Classe | Description |
|--------|-------------|
| `.animate-fade-in` | Apparition en fondu |
| `.animate-fade-in-up` | Apparition du bas vers le haut |
| `.animate-fade-in-down` | Apparition du haut vers le bas |
| `.animate-scale-in` | Apparition avec zoom |
| `.animate-slide-in-right` | Glissement depuis la droite |
| `.animate-slide-in-left` | Glissement depuis la gauche |
| `.animate-shimmer` | Effet de chargement brillant |
| `.animate-pulse-slow` | Pulsation lente |
| `.animate-bounce-subtle` | Rebond subtil |

### Délais d'Animation

```tsx
<div className="animate-fade-in-up delay-100">Premier</div>
<div className="animate-fade-in-up delay-200">Deuxième</div>
<div className="animate-fade-in-up delay-300">Troisième</div>
```

### Accessibilité (Reduced Motion)

Les animations sont automatiquement désactivées pour les utilisateurs qui préfèrent réduire les mouvements :

```css
@media (prefers-reduced-motion: reduce) {
  * {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}
```

---

## Composants UI

### Boutons

```tsx
import { Button } from "@/components/ui/button"

// Variants
<Button variant="default">Primary</Button>
<Button variant="secondary">Secondary</Button>
<Button variant="outline">Outline</Button>
<Button variant="ghost">Ghost</Button>
<Button variant="destructive">Destructive</Button>

// Tailles
<Button size="sm">Small</Button>
<Button size="default">Default</Button>
<Button size="lg">Large</Button>
<Button size="icon"><Icon /></Button>
```

### Cards

```tsx
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card"

<Card>
  <CardHeader>
    <CardTitle>Titre</CardTitle>
    <CardDescription>Description</CardDescription>
  </CardHeader>
  <CardContent>
    Contenu principal
  </CardContent>
  <CardFooter>
    <Button>Action</Button>
  </CardFooter>
</Card>
```

### Inputs

```tsx
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

<div className="space-y-2">
  <Label htmlFor="email">Email</Label>
  <Input id="email" type="email" placeholder="votre@email.com" />
</div>

// Ou avec la classe utilitaire
<input className="input-field" placeholder="..." />
```

### Badges

```tsx
import { Badge } from "@/components/ui/badge"

<Badge>Default</Badge>
<Badge variant="secondary">Secondary</Badge>
<Badge variant="outline">Outline</Badge>
<Badge variant="destructive">Destructive</Badge>

// Status badges personnalisés
<span className="status-success px-2 py-1 rounded-full text-sm">
  Confirmé
</span>
```

### Alerts

```tsx
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert"

<Alert>
  <AlertTitle>Information</AlertTitle>
  <AlertDescription>Message informatif</AlertDescription>
</Alert>

<Alert variant="destructive">
  <AlertTitle>Erreur</AlertTitle>
  <AlertDescription>Une erreur est survenue</AlertDescription>
</Alert>
```

---

## Classes Utilitaires

### Gradients de Texte

```tsx
<h1 className="text-gradient">
  Teens Party Morocco
</h1>

<span className="text-gradient-primary">Primary gradient</span>
<span className="text-gradient-accent">Accent gradient</span>
```

### Effets de Glow

```tsx
// Glow primary
<div className="glow-sm">Subtle glow</div>
<div className="glow-md">Medium glow</div>
<div className="glow-lg">Large glow</div>

// Glow accent
<div className="glow-accent-lg">Accent glow</div>

// Legacy (compatibilité)
<div className="card-glow">Card with glow</div>
```

### Effets de Hover

```tsx
// Lift effect (élévation au hover)
<div className="hover-lift">
  S'élève au survol
</div>

// Scale effect (zoom au hover)
<div className="hover-scale">
  Zoom au survol
</div>

// Glow effect au hover
<div className="hover-glow">
  Brille au survol
</div>
```

### Glass Effects (Glassmorphism)

```tsx
// Glass background
<div className="glass p-4">
  Fond transparent avec blur
</div>

// Glass card
<div className="glass-card p-6">
  Card avec effet verre
</div>
```

### Backgrounds Patterns

```tsx
// Dot pattern
<div className="bg-dots">
  Points en arrière-plan
</div>

// Grid pattern
<div className="bg-grid">
  Grille en arrière-plan
</div>

// Hero gradient
<section className="hero-gradient">
  Section hero avec gradient radial
</section>
```

### Status Indicators

```tsx
<span className="status-success px-3 py-1 rounded-full">Validé</span>
<span className="status-warning px-3 py-1 rounded-full">En attente</span>
<span className="status-info px-3 py-1 rounded-full">Info</span>
<span className="status-destructive px-3 py-1 rounded-full">Erreur</span>
```

### Containers

```tsx
// Container tight (max-w-4xl)
<div className="container-tight">
  Contenu étroit (articles, formulaires)
</div>

// Container wide (max-w-7xl)
<div className="container-wide">
  Contenu large (grilles, galleries)
</div>

// Container full width
<div className="container-full">
  Pleine largeur avec padding
</div>
```

---

## Accessibilité

### Contrastes Minimums

Tous les tokens de couleur respectent les ratios WCAG AA :
- **Texte normal** : ratio minimum 4.5:1
- **Texte large (18px+)** : ratio minimum 3:1
- **Composants UI** : ratio minimum 3:1

### Focus Visible

```css
:focus-visible {
  outline: 2px solid var(--ring);
  outline-offset: 2px;
}
```

### Reduced Motion

Les animations sont automatiquement désactivées pour `prefers-reduced-motion: reduce`.

### Bonnes Pratiques

```tsx
// Toujours inclure des labels
<Label htmlFor="input-id">Label visible</Label>
<Input id="input-id" aria-describedby="help-text" />
<p id="help-text" className="text-sm text-muted-foreground">
  Texte d'aide
</p>

// Boutons avec texte ou aria-label
<Button aria-label="Fermer le modal">
  <XIcon />
</Button>

// Liens avec texte descriptif
<a href="/events">Voir tous les événements</a>
// ❌ <a href="/events">Cliquez ici</a>
```

---

## Exemples d'Utilisation

### Card d'Événement

```tsx
<Card className="hover-lift overflow-hidden">
  <div className="relative aspect-video">
    <Image src="/event.jpg" alt="Événement" fill className="object-cover" />
    <Badge className="absolute top-4 right-4">
      Bientôt complet
    </Badge>
  </div>
  <CardHeader>
    <CardTitle className="text-xl">Soirée Glow Party</CardTitle>
    <CardDescription className="flex items-center gap-2">
      <CalendarIcon className="w-4 h-4" />
      15 Décembre 2024
    </CardDescription>
  </CardHeader>
  <CardContent>
    <p className="text-muted-foreground">
      Une soirée inoubliable avec DJ, animations et surprises !
    </p>
  </CardContent>
  <CardFooter className="flex justify-between">
    <span className="text-lg font-semibold text-primary">150 MAD</span>
    <Button>Réserver</Button>
  </CardFooter>
</Card>
```

### Section Hero

```tsx
<section className="relative py-24 md:py-32 hero-gradient overflow-hidden">
  {/* Background pattern */}
  <div className="absolute inset-0 bg-dots opacity-30" />

  <div className="container-wide relative z-10">
    <div className="max-w-3xl mx-auto text-center space-y-6">
      <h1 className="text-4xl md:text-6xl font-bold text-gradient animate-fade-in-up">
        Teens Party Morocco
      </h1>
      <p className="text-xl text-muted-foreground animate-fade-in-up delay-200">
        La soirée N°1 pour les ados de 13 à 17 ans au Maroc
      </p>
      <div className="flex flex-col sm:flex-row gap-4 justify-center animate-fade-in-up delay-300">
        <Button size="lg" className="glow-md">
          Réserver maintenant
        </Button>
        <Button size="lg" variant="outline">
          Découvrir
        </Button>
      </div>
    </div>
  </div>
</section>
```

### Formulaire de Contact

```tsx
<Card className="glass-card max-w-md mx-auto">
  <CardHeader>
    <CardTitle>Contactez-nous</CardTitle>
    <CardDescription>
      Nous répondons sous 24h
    </CardDescription>
  </CardHeader>
  <CardContent className="space-y-4">
    <div className="space-y-2">
      <Label htmlFor="name">Nom complet</Label>
      <Input id="name" placeholder="Votre nom" />
    </div>
    <div className="space-y-2">
      <Label htmlFor="email">Email</Label>
      <Input id="email" type="email" placeholder="votre@email.com" />
    </div>
    <div className="space-y-2">
      <Label htmlFor="message">Message</Label>
      <Textarea id="message" placeholder="Votre message..." rows={4} />
    </div>
  </CardContent>
  <CardFooter>
    <Button className="w-full">
      Envoyer
    </Button>
  </CardFooter>
</Card>
```

### Stats Grid

```tsx
<div className="grid grid-cols-2 md:grid-cols-4 gap-6">
  {[
    { value: "15K+", label: "Participants" },
    { value: "98%", label: "Parents satisfaits" },
    { value: "50+", label: "Événements" },
    { value: "5", label: "Villes" },
  ].map((stat, i) => (
    <Card
      key={stat.label}
      className={`text-center p-6 hover-scale animate-fade-in-up delay-${(i + 1) * 100}`}
    >
      <div className="text-3xl font-bold text-primary">{stat.value}</div>
      <div className="text-sm text-muted-foreground">{stat.label}</div>
    </Card>
  ))}
</div>
```

---

## Checklist de Cohérence

Avant de merger une PR, vérifier :

- [ ] Utilisation des tokens de couleur (pas de valeurs hardcodées)
- [ ] Spacing conforme à l'échelle (multiples de 4px)
- [ ] Typographie conforme (tailles, poids, hauteurs de ligne)
- [ ] Border radius cohérents
- [ ] Shadows appropriées au niveau d'élévation
- [ ] Z-index utilisant les tokens sémantiques
- [ ] Animations avec durées/easings standards
- [ ] Focus visible sur tous les éléments interactifs
- [ ] Contraste suffisant (WCAG AA)
- [ ] Support de `prefers-reduced-motion`

---

## Ressources

- **Fichier source** : `/app/globals.css`
- **Composants UI** : `/components/ui/`
- **Tailwind CSS** : [Documentation](https://tailwindcss.com/docs)
- **Radix UI** : [Documentation](https://www.radix-ui.com/)
- **shadcn/ui** : [Documentation](https://ui.shadcn.com/)

---

*Dernière mise à jour : Décembre 2024*

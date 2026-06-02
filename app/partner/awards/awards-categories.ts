// Catégories d'attribution XP — partagées entre l'UI client (awards-client.tsx)
// et le détail serveur (/partner/awards/[id]/page.tsx).
//
// IMPORTANT : défini dans un module SANS directive "use client". Un Server
// Component qui importe une valeur non-composant depuis un module "use client"
// reçoit un stub de référence client (et non le vrai tableau) → `CATS.map(...)`
// throw `CATS.map is not a function` au build (collecte des pages). Ce module
// neutre est importable des deux côtés de la frontière serveur/client.
export const CATS = [
  { id: "school", label: "École 📚" },
  { id: "sport", label: "Sport 💪" },
  { id: "crea", label: "Créa 🎨" },
]

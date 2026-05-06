/**
 * Moroccan Context Knowledge Base (Phase 5.1 - Audit Quiz)
 *
 * Base statique de contexte marocain pour enrichir les quiz generes.
 * - Geographie, histoire, culture, personnalites publiques (non controversees)
 * - Helper de detection d'entites pour suggerer un fait additionnel
 */

export interface MoroccanFact {
  entity: string
  category: "geography" | "history" | "culture" | "people"
  fact: string
  aliases?: string[]
}

// ---------- GEOGRAPHIE ----------
export const MOROCCAN_CITIES: string[] = [
  "Casablanca",
  "Rabat",
  "Marrakech",
  "Fes",
  "Tanger",
  "Agadir",
  "Meknes",
  "Oujda",
  "Tetouan",
  "Kenitra",
  "Laayoune",
  "Dakhla",
  "Essaouira",
  "Chefchaouen",
  "Ifrane",
]

export const MOROCCAN_REGIONS: string[] = [
  "Tanger-Tetouan-Al Hoceima",
  "L'Oriental",
  "Fes-Meknes",
  "Rabat-Sale-Kenitra",
  "Beni Mellal-Khenifra",
  "Casablanca-Settat",
  "Marrakech-Safi",
  "Draa-Tafilalet",
  "Souss-Massa",
  "Guelmim-Oued Noun",
  "Laayoune-Sakia El Hamra",
  "Dakhla-Oued Ed-Dahab",
]

export const OFFICIAL_LANGUAGES: string[] = ["Arabe", "Amazighe (Tamazight)"]

// ---------- HISTOIRE ----------
export const HISTORICAL_DATES: Array<{ year: number; event: string }> = [
  { year: 788, event: "Fondation de la dynastie Idrisside par Idris Ier" },
  { year: 1062, event: "Fondation de Marrakech par les Almoravides" },
  { year: 1269, event: "Chute des Almohades, debut des Merinides" },
  { year: 1666, event: "Fondation de la dynastie Alaouite, encore au pouvoir" },
  { year: 1912, event: "Traite de Fes - debut du Protectorat francais" },
  { year: 1956, event: "Independance du Maroc" },
  { year: 1975, event: "Marche Verte sur le Sahara" },
  { year: 1999, event: "Intronisation du roi Mohammed VI" },
  { year: 2011, event: "Adoption de la nouvelle Constitution" },
]

export const DYNASTIES: string[] = [
  "Idrisside",
  "Almoravide",
  "Almohade",
  "Merinide",
  "Wattasside",
  "Saadienne",
  "Alaouite",
]

// ---------- CULTURE ----------
export const NATIONAL_HOLIDAYS: Array<{ date: string; name: string }> = [
  { date: "11 janvier", name: "Manifeste de l'Independance" },
  { date: "1 mai", name: "Fete du Travail" },
  { date: "30 juillet", name: "Fete du Trone" },
  { date: "14 aout", name: "Allegeance Oued Ed-Dahab" },
  { date: "20 aout", name: "Revolution du Roi et du Peuple" },
  { date: "21 aout", name: "Fete de la Jeunesse" },
  { date: "6 novembre", name: "Marche Verte" },
  { date: "18 novembre", name: "Fete de l'Independance" },
]

export const ICONIC_DISHES: string[] = [
  "Tagine",
  "Couscous",
  "Pastilla",
  "Harira",
  "Mechoui",
  "Rfissa",
  "Tangia",
  "Bissara",
  "Briouates",
  "Chebakia",
]

export const POPULAR_SPORTS: string[] = [
  "Football",
  "Athletisme",
  "Boxe",
  "Tennis",
  "Karate",
  "Equitation",
]

// ---------- PERSONNALITES PUBLIQUES (non controversees) ----------
export const PUBLIC_FIGURES: Array<{ name: string; field: string; note: string }> = [
  { name: "Mohammed VI", field: "Royaute", note: "Roi du Maroc depuis 1999" },
  { name: "Hassan II", field: "Royaute", note: "Roi du Maroc 1961-1999" },
  { name: "Mohammed V", field: "Royaute", note: "Roi de l'independance" },
  { name: "Hicham El Guerrouj", field: "Athletisme", note: "Champion olympique 1500m/5000m" },
  { name: "Nawal El Moutawakel", field: "Athletisme", note: "1ere championne olympique africaine 1984" },
  { name: "Achraf Hakimi", field: "Football", note: "International marocain, PSG" },
  { name: "Yassine Bounou", field: "Football", note: "Gardien des Lions de l'Atlas" },
  { name: "Saad Lamjarred", field: "Musique", note: "Chanteur populaire" },
  { name: "Leila Slimani", field: "Litterature", note: "Prix Goncourt 2016" },
  { name: "Tahar Ben Jelloun", field: "Litterature", note: "Prix Goncourt 1987" },
]

// Index normalise pour la detection
function buildEntityIndex(): MoroccanFact[] {
  const facts: MoroccanFact[] = []
  for (const city of MOROCCAN_CITIES) {
    facts.push({
      entity: city,
      category: "geography",
      fact: `${city} est une ville importante du Maroc.`,
    })
  }
  for (const region of MOROCCAN_REGIONS) {
    facts.push({
      entity: region,
      category: "geography",
      fact: `${region} est l'une des 12 regions administratives du Maroc.`,
    })
  }
  for (const dyn of DYNASTIES) {
    facts.push({
      entity: dyn,
      category: "history",
      fact: `La dynastie ${dyn} a marque l'histoire du Maroc.`,
    })
  }
  for (const dish of ICONIC_DISHES) {
    facts.push({
      entity: dish,
      category: "culture",
      fact: `Le ${dish} est un plat emblematique de la cuisine marocaine.`,
    })
  }
  for (const figure of PUBLIC_FIGURES) {
    facts.push({
      entity: figure.name,
      category: "people",
      fact: figure.note,
    })
  }
  // Geographie additionnelle
  facts.push({
    entity: "Atlas",
    category: "geography",
    fact: "L'Atlas est la principale chaine de montagnes du Maroc, avec le Toubkal (4167 m).",
    aliases: ["Haut Atlas", "Moyen Atlas", "Anti-Atlas"],
  })
  facts.push({
    entity: "Sahara",
    category: "geography",
    fact: "Le Sahara s'etend au sud du Maroc.",
  })
  facts.push({
    entity: "Toubkal",
    category: "geography",
    fact: "Le Jbel Toubkal (4167 m) est le plus haut sommet d'Afrique du Nord.",
  })
  return facts
}

const ENTITY_INDEX = buildEntityIndex()

/**
 * Normalise une chaine pour la comparaison (minuscules + suppression accents).
 */
function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
}

/**
 * Detecte les entites marocaines presentes dans un texte de question
 * et propose un fait additionnel pour enrichir.
 */
export function enrichWithMoroccanContext(questionText: string): {
  detectedEntities: MoroccanFact[]
  suggestion?: string
} {
  if (!questionText || typeof questionText !== "string") {
    return { detectedEntities: [] }
  }

  const normText = normalize(questionText)
  const detected: MoroccanFact[] = []

  for (const fact of ENTITY_INDEX) {
    const variants = [fact.entity, ...(fact.aliases || [])]
    const found = variants.some((v) => {
      const normV = normalize(v)
      // mot complet (frontiere de mots simples sur l'index normalise)
      const re = new RegExp(`\\b${normV.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`)
      return re.test(normText)
    })
    if (found) {
      detected.push(fact)
    }
  }

  // Deduplication par entite
  const dedup: MoroccanFact[] = []
  const seen = new Set<string>()
  for (const f of detected) {
    if (seen.has(f.entity)) continue
    seen.add(f.entity)
    dedup.push(f)
  }

  const suggestion = dedup[0]?.fact
  return { detectedEntities: dedup, suggestion }
}

/**
 * Compte combien de questions d'un quiz mentionnent du contexte marocain.
 * Utile pour le scoring de couverture.
 */
export function moroccanCoverage(
  questions: Array<{ question: string }>,
): { covered: number; total: number; ratio: number } {
  const total = questions.length
  if (total === 0) return { covered: 0, total: 0, ratio: 0 }
  let covered = 0
  for (const q of questions) {
    const { detectedEntities } = enrichWithMoroccanContext(q.question || "")
    if (detectedEntities.length > 0) covered++
  }
  return { covered, total, ratio: covered / total }
}

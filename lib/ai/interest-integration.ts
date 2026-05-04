/**
 * Interest Integration System
 * Intègre intelligemment les intérêts des ados dans les quiz générés
 */

export interface GenerationParams {
  contentType?: string
  category?: string
  gradeLevel?: string
  difficulty?: "easy" | "normal" | "hard" | "expert"
  interests?: string[]
  profiles?: string[]
  subject?: string
  count?: number
  customPrompt?: string
}

export class InterestIntegration {
  /**
   * Mappe les intérêts aux matières pertinentes
   */
  private static readonly INTEREST_TO_SUBJECT_MAP: Record<string, string[]> = {
    "Football": ["Mathématiques", "Histoire", "Géographie", "Sciences"],
    "K-Pop": ["Anglais", "Histoire", "Géographie", "Langues"],
    "Danse": ["Histoire", "Géographie", "Sciences", "Éducation Physique"],
    "Musique": ["Histoire", "Géographie", "Sciences", "Arts"],
    "Jeux vidéo": ["Mathématiques", "Sciences", "Anglais", "Informatique"],
    "Cinéma": ["Français", "Histoire", "Géographie", "Arts"],
    "Lecture": ["Français", "Histoire", "Littérature", "Culture générale"],
    "Sport": ["Sciences", "Éducation Physique", "Biologie", "Mathématiques"],
    "Art": ["Arts", "Histoire", "Géographie", "Culture générale"],
    "Technologie": ["Sciences", "Mathématiques", "Informatique", "Physique"],
    "Cuisine": ["Sciences", "Chimie", "Géographie", "Culture générale"],
    "Voyage": ["Géographie", "Histoire", "Langues", "Culture générale"],
  }

  /**
   * Intègre les intérêts dans les paramètres de génération
   */
  static integrateInterests(
    params: GenerationParams,
    interests: string[]
  ): GenerationParams {
    if (!interests || interests.length === 0) {
      return params
    }

    const enhancedParams = { ...params }

    // Si pas de matière spécifiée, suggérer selon intérêts
    if (!enhancedParams.subject && interests.length > 0) {
      const primaryInterest = interests[0]
      const suggestedSubjects = this.INTEREST_TO_SUBJECT_MAP[primaryInterest] || []
      
      if (suggestedSubjects.length > 0) {
        enhancedParams.subject = suggestedSubjects[0]
      }
    }

    // Ajouter prompt d'intégration personnalisé
    enhancedParams.customPrompt = this.buildInterestIntegrationPrompt(
      interests,
      enhancedParams.subject
    )

    return enhancedParams
  }

  /**
   * Construit un prompt d'intégration des intérêts
   */
  private static buildInterestIntegrationPrompt(
    interests: string[],
    subject?: string
  ): string {
    const parts: string[] = []
    
    parts.push(`🎯 INTÉGRATION DES INTÉRÊTS:`)
    parts.push(`L'ado est passionné par: ${interests.join(", ")}`)
    parts.push(``)
    parts.push(`INSTRUCTION: Intègre ces intérêts dans les questions quand c'est pertinent.`)
    parts.push(`Cela rendra le quiz plus engageant et motivant.`)
    parts.push(`⚠️ TOUTES les questions et exemples doivent être en FRANÇAIS.`)
    parts.push(``)

    // Exemples spécifiques par intérêt
    interests.forEach((interest, index) => {
      const examples = this.getInterestIntegrationExamples(interest, subject)
      if (examples.length > 0) {
        parts.push(`${index + 1}. ${interest.toUpperCase()}:`)
        examples.forEach(example => {
          parts.push(`   - ${example}`)
        })
        parts.push(``)
      }
    })

    parts.push(`IMPORTANT:`)
    parts.push(`- N'intègre les intérêts QUE si c'est pertinent et naturel`)
    parts.push(`- Ne force pas l'intégration si ça n'a pas de sens`)
    parts.push(`- L'objectif est de rendre le quiz plus engageant, pas de le dénaturer`)

    return parts.join("\n")
  }

  /**
   * Génère des exemples d'intégration d'intérêts
   */
  private static getInterestIntegrationExamples(
    interest: string,
    subject?: string
  ): string[] {
    const examples: Record<string, Record<string, string[]>> = {
      "Football": {
        "Mathématiques": [
          "Calcule la vitesse moyenne d'un joueur qui court 100m en 12 secondes",
          "Un stade marocain peut accueillir 45,000 spectateurs. Si 38,000 places sont occupées, quel est le pourcentage d'occupation ?",
          "Un joueur marque 15 buts en 20 matchs. Quel est son ratio de buts par match ?"
        ],
        "Histoire": [
          "Quand le Maroc a-t-il participé à sa première Coupe du Monde ?",
          "Quel joueur marocain a été le premier à jouer en Ligue des Champions ?",
          "Quelle équipe marocaine a remporté la Ligue des Champions africaine ?"
        ],
        "Géographie": [
          "Dans quelle ville marocaine se trouve le stade Mohammed V ?",
          "Quelle est la capacité du stade de Marrakech ?",
          "Combien de stades de plus de 30,000 places y a-t-il au Maroc ?"
        ],
        "Sciences": [
          "Quelle est la force nécessaire pour donner une accélération de 5 m/s² à un ballon de 0.4 kg ?",
          "Pourquoi un ballon de foot rebondit-il ? (Physique)",
          "Quels muscles sont principalement sollicités lors d'un sprint ? (Biologie)"
        ]
      },
      "K-Pop": {
        "Anglais": [
          "Traduis 'Hello' en coréen",
          "Quel est le sens de 'Oppa' en coréen ?",
          "Comment dit-on 'Merci' en coréen ?"
        ],
        "Géographie": [
          "Quelle est la capitale de la Corée du Sud ?",
          "Combien d'habitants compte Séoul ?",
          "Quelle est la superficie de la Corée du Sud ?"
        ],
        "Histoire": [
          "Quand la K-Pop a-t-elle commencé à devenir populaire mondialement ?",
          "Quel groupe K-Pop a été le premier à avoir un succès international ?",
          "Quelle est l'histoire de la division de la Corée ?"
        ]
      },
      "Danse": {
        "Histoire": [
          "Quelles sont les origines de la danse traditionnelle marocaine ?",
          "Quelle danse marocaine est la plus connue internationalement ?",
          "Quand la danse moderne a-t-elle émergé au Maroc ?"
        ],
        "Géographie": [
          "Dans quelle région du Maroc trouve-t-on la danse Ahidous ?",
          "Quelles sont les danses traditionnelles de chaque région marocaine ?",
          "Quelle ville marocaine est connue pour son festival de danse ?"
        ],
        "Sciences": [
          "Quels muscles sont sollicités lors d'une pirouette ? (Biologie)",
          "Quelle est la physique du mouvement dans la danse ?",
          "Combien de calories brûle-t-on en dansant 30 minutes ?"
        ]
      },
      "Musique": {
        "Histoire": [
          "Quels sont les instruments traditionnels marocains ?",
          "Quelle est l'histoire de la musique andalouse au Maroc ?",
          "Quels artistes marocains ont eu un impact international ?"
        ],
        "Géographie": [
          "Quelle ville marocaine est connue pour son festival de musique ?",
          "D'où vient la musique Gnawa au Maroc ?",
          "Quelles sont les influences géographiques de la musique marocaine ?"
        ],
        "Sciences": [
          "Quelle est la fréquence d'une note La (440 Hz) ? (Physique)",
          "Comment fonctionne l'oreille humaine ? (Biologie)",
          "Quelle est la vitesse du son dans l'air ?"
        ]
      },
      "Jeux vidéo": {
        "Mathématiques": [
          "Un joueur gagne 150 XP par ennemi. Combien d'XP gagne-t-il en tuant 20 ennemis ?",
          "Un jeu coûte 299 DH. Avec une réduction de 25%, quel est le nouveau prix ?",
          "Si un personnage se déplace à 5 pixels par frame et qu'il y a 60 frames par seconde, quelle est sa vitesse en pixels/seconde ?"
        ],
        "Sciences": [
          "Quelle est la physique derrière les collisions dans les jeux vidéo ?",
          "Comment fonctionne un processeur graphique (GPU) ?",
          "Quelle est la différence entre RAM et VRAM ?"
        ],
        "Anglais": [
          "Que signifie 'FPS' dans le contexte gaming ?",
          "Traduis 'Achievement unlocked' en français",
          "Quel est le vocabulaire technique du gaming en anglais ?"
        ]
      },
      "Cinéma": {
        "Français": [
          "Analyse la structure narrative d'un film marocain",
          "Quels sont les éléments d'un scénario ?",
          "Comment analyser un personnage de film ?"
        ],
        "Histoire": [
          "Quelle est l'histoire du cinéma marocain ?",
          "Quels films marocains ont remporté des prix internationaux ?",
          "Quand le premier film marocain a-t-il été produit ?"
        ],
        "Géographie": [
          "Quelles villes marocaines sont utilisées comme lieux de tournage ?",
          "Où se trouve le Festival International du Film de Marrakech ?",
          "Quels studios de cinéma existent au Maroc ?"
        ]
      }
    }

    if (subject && examples[interest]?.[subject]) {
      return examples[interest][subject]
    }

    // Retourner des exemples généraux si pas de correspondance spécifique
    if (examples[interest]) {
      return Object.values(examples[interest]).flat().slice(0, 3)
    }

    return []
  }

  /**
   * Vérifie si un intérêt peut être intégré dans une matière
   */
  static canIntegrateInterest(interest: string, subject: string): boolean {
    const relevantSubjects = this.INTEREST_TO_SUBJECT_MAP[interest] || []
    return relevantSubjects.includes(subject)
  }

  /**
   * Suggère des matières selon les intérêts
   */
  static suggestSubjects(interests: string[]): string[] {
    const subjectCounts: Record<string, number> = {}

    interests.forEach(interest => {
      const subjects = this.INTEREST_TO_SUBJECT_MAP[interest] || []
      subjects.forEach(subject => {
        subjectCounts[subject] = (subjectCounts[subject] || 0) + 1
      })
    })

    // Trier par fréquence et retourner les top 3
    return Object.entries(subjectCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([subject]) => subject)
  }
}


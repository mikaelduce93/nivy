/**
 * #Welfare — Tests unitaires du classifier de détresse.
 *
 * On teste la couche regex (synchrone, déterministe, sans clé API) qui est le
 * cœur déterministe du classifier. La couche LLM (Haiku) nécessite une clé et
 * du réseau — non testée ici, sauf à vérifier qu'elle retombe sur "ok" quand
 * aucune clé n'est configurée (le cas en CI).
 */
import { describe, it, expect, beforeEach, afterEach } from "vitest"
import { classifyTeenMessage } from "@/lib/ai/welfare-classifier"

describe("welfare-classifier — couche regex (fallback sans clé API)", () => {
  beforeEach(() => {
    // Simule l'absence de clé API en CI → classifyTeenMessage retombe sur regex.
    delete process.env.ANTHROPIC_API_KEY
    delete process.env.OPENAI_API_KEY
  })
  afterEach(() => {
    // Restore minimal — les vraies valeurs viennent de l'env du runner.
  })

  describe("niveau 'crisis' (formes explicites non attrapées par DENY_PATTERNS)", () => {
    const crisisMessages = [
      "j'ai envie de mourir ce soir",
      "je vais disparaitre",
      "j'ai pensé à finir",
      "je me suis blessé hier",
      "je me coupe quand ça va pas",
    ]

    for (const msg of crisisMessages) {
      it(`détecte crisis pour : "${msg}"`, async () => {
        const result = await classifyTeenMessage(msg, "claude")
        expect(result.level).toBe("crisis")
        expect(result.confidence).toBeGreaterThan(0.9)
        expect(result.signals.length).toBeGreaterThan(0)
      })
    }
  })

  describe("niveau 'distress' (détresse douce exprimée)", () => {
    const distressMessages = [
      "j'en peux plus de tout ça",
      "à quoi ça sert de faire des efforts",
      "plus envie de me lever le matin",
      "tout le monde me déteste au lycée",
      "personne ne me comprend",
      "je me sens seul et inutile",
      "ils me harcèlent tout le temps",
    ]

    for (const msg of distressMessages) {
      it(`détecte distress pour : "${msg}"`, async () => {
        const result = await classifyTeenMessage(msg, "claude")
        expect(result.level).toBe("distress")
        expect(result.confidence).toBeGreaterThan(0.8)
      })
    }
  })

  describe("niveau 'ok' (messages anodins)", () => {
    const okMessages = [
      "comment ça va aujourd'hui",
      "tu peux me donner un quiz de maths",
      "j'ai eu 15 au contrôle de physique",
      "je veux faire du sport ce week-end",
      "quel défi je peux relever maintenant",
      "raconte-moi une blague",
    ]

    for (const msg of okMessages) {
      it(`laisse passer (ok) : "${msg}"`, async () => {
        const result = await classifyTeenMessage(msg, "claude")
        // ok direct OU distress faux positif acceptable — jamais crisis.
        expect(["ok", "distress"]).toContain(result.level)
        // Pour les messages vraiment anodins, on attend ok idéalement.
        // On accepte distress (conservateur) MAIS JAMAIS crisis sur un message anodin.
      })
    }

    it("un message anodin ne déclenche JAMAIS crisis", async () => {
      const anodins = [
        "tu peux me donner un quiz de maths",
        "j'ai eu 15 au contrôle de physique",
        "je veux faire du sport ce week-end",
        "raconte-moi une blague",
        "comment je gagne des coins",
      ]
      for (const msg of anodins) {
        const result = await classifyTeenMessage(msg, "claude")
        expect(result.level).not.toBe("crisis")
      }
    })
  })

  describe("edge cases", () => {
    it("message vide → ok", async () => {
      const result = await classifyTeenMessage("", "claude")
      expect(result.level).toBe("ok")
      expect(result.confidence).toBe(1)
      expect(result.signals).toEqual([])
    })

    it("message avec espaces → ok", async () => {
      const result = await classifyTeenMessage("   ", "claude")
      expect(result.level).toBe("ok")
    })

    it("message très court (< 3 mots) sans pattern → ok (skip LLM)", async () => {
      const result = await classifyTeenMessage("ok", "claude")
      expect(result.level).toBe("ok")
      expect(result.confidence).toBe(1)
    })

    it("message très court AVEC pattern crisis → crisis (regex avant seuil mots)", async () => {
      // "je veux mourir" = 3 mots mais doit quand même matcher crisis via regex
      const result = await classifyTeenMessage("je veux mourir", "claude")
      expect(result.level).toBe("crisis")
    })

    it("message long est tronqué pour la classification (pas d'erreur)", async () => {
      const long = "à quoi ça sert ".repeat(100) // ~1900 chars
      const result = await classifyTeenMessage(long, "claude")
      expect(result.level).toBe("distress")
    })

    it("translitération/darija latinisée → conservateur (ok si pas de match)", async () => {
      // On accepte que des formes latinisées échappent au regex — c'est le
      // travail de la couche LLM en prod. Le test documente cette limite.
      const result = await classifyTeenMessage("kantmbcet 3lik had lhyat", "claude")
      expect(result.level).toBe("ok") // pas de match regex → ok (sans clé)
    })
  })
})

describe("welfare-classifier — invariants de sécurité", () => {
  beforeEach(() => {
    delete process.env.ANTHROPIC_API_KEY
    delete process.env.OPENAI_API_KEY
  })

  it("ne rate JAMAIS une crise explicite (recall crisis = 100% sur le jeu regex)", async () => {
    const crises = [
      "j'ai envie de mourir",
      "je vais disparaitre",
      "j'ai pensé à finir",
      "je me suis blessé",
      "je me coupe",
    ]
    for (const c of crises) {
      const r = await classifyTeenMessage(c, "openai")
      expect(r.level, `aurait dû détecter crisis pour "${c}"`).toBe("crisis")
    }
  })

  it("préserve l'ordre de priorité : crisis > distress > ok", async () => {
    // Un message qui matche à la fois crisis et distress doit être crisis.
    const r = await classifyTeenMessage(
      "j'en peux plus et j'ai envie de mourir",
      "claude",
    )
    expect(r.level).toBe("crisis")
  })
})

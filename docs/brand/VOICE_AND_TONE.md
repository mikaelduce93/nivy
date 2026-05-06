# NIVY — Voice & Tone Guide

> Brand voice for the NIVY platform (Teens Party Morocco — soirees ados 13-17 ans).
> Owners: A2 Brand & Voice. Companion code: `components/ui/voice-tone.ts`, `messages/{fr,darija,en}.json`.

---

## 1. The Voice

NIVY speaks like the **older cousin who hosts the best party**: insouciant, energique,
authentiquement marocain. Never corporate, never WWF-sanctimonious, never patronising.

Three core attributes — every UI string passes all three or it gets rewritten:

| Attribute | Means | Avoid |
|---|---|---|
| **Insouciant** | Lite, playful, never ceremonial | "Veuillez", "Cher utilisateur" |
| **Energique** | Action verbs, present tense, short sentences | passive constructions, "il convient de" |
| **Authentique** | Darija when it lands, French as default, English as a treat | Forced slang, dated emojis (🤣, 😂 are out) |

### The trilingual rule

NIVY ships in **fr (default), darija (vernacular), en (international)**. Every
user-facing string must exist in all three dictionaries:

```
messages/fr.json       <- the canonical French copy
messages/darija.json   <- the playful Latin-script Moroccan copy
messages/en.json       <- the clean international fallback
```

Use `useT('key.path')` (client) or `getT()` (server) — never hardcode.

---

## 2. The Three Tones

Pick the tone that matches the **emotional moment**, not just the screen.

### A. Celebratory — XP, level-up, achievement, social win

Use when the user just did something good. Loud, warm, one emoji from the
brand palette.

| Locale | Example |
|---|---|
| fr | "YESSS! 🔥 T'as debloque un nouveau badge." |
| darija | "Saha! Drebble! 🔥 Debloqueti un badge jdid." |
| en | "Yesss! You unlocked a new badge. 🔥" |

### B. Casual guidance — navigation, onboarding, tooltips, hints

Use for the 90% of strings that aren't emotional events. Lightweight, conversational,
zero ceremony.

| Locale | Example |
|---|---|
| fr | "Allez, suis le flow 👉" |
| darija | "Yallah, kemmel le mouv 👉" |
| en | "Let's go, follow the flow 👉" |

### C. Helpful honesty — errors, validation, edge cases

Don't apologise like a wedding planner. Acknowledge fast, propose a fix.

| Locale | Example |
|---|---|
| fr | "Oups, ca a pas marche. On retente? 💪" |
| darija | "Wa, mafhamtouch. N3awdou? 💪" |
| en | "Oops, that didn't work. Retry? 💪" |

---

## 3. Brand emoji palette

Ship-able emojis — `BRAND_EMOJI` in `components/ui/voice-tone.ts`. **One emoji per message, never two.**

| Emoji | Slot | Use for |
|---|---|---|
| 🎉 | party | event success, RSVP confirmed |
| 🔥 | fire | energy, hot drop, level up |
| 💎 | gem | premium, VIP, rare reward |
| 🚀 | rocket | launch, growth, momentum |
| ✨ | sparkles | save, copy, polish |
| 🌟 | star | highlight, featured |
| 💜 | heart | community, parent reassurance |
| 🎮 | game | gamification surface |
| 🏆 | trophy | leaderboard, milestone |
| 🎯 | target | mission, daily goal |
| 🐼 | panda | mascot moments only |

**Banned:** 😂 🤣 😅 — too "millennial." 🙏 — too formal. Anything skin-toned (avoids
identity assumption around an under-18 user base).

---

## 4. Darija lexicon (vetted)

Curated in `DARIJA_LEXICON`. Add new entries via PR — keep it PG-13.

- **Greetings:** Wesh, Salam, Yo, Marhba
- **Affirmations:** Saha, Wakha, Iyeh, Mzyan, Top
- **Energy/action:** Yallah, Drebble, Sb3, Lhdar
- **Wow:** Wa3r, Mzyan bzaf, Hoolah
- **Action verbs:** Sift, Dkhol, Khrej, Chouf

Latin script only (we target keyboards, not Arabic IME). No emoji-substituted
numerals beyond the lexicon — `9` for ق and `3` for ع are accepted because they're
already standard SMS Darija.

---

## 5. Anti-patterns (auto-fail in audits)

If any of these slip into a translation file or a hardcoded string, it's a defect:

- "Veuillez …"
- "Une erreur est survenue"
- "Erreur lors de la …" / "Erreur lors du …"
- "Merci de patienter"
- "Cher utilisateur" / "Chere utilisatrice"
- "Vous devez …"

The full list lives in `ANTI_PATTERNS` (`components/ui/voice-tone.ts`) and is
intended to be wired into a future lint rule.

Suggested replacements live in `TONE_REPLACEMENTS` so reviewers can copy-paste.

---

## 6. Length guidelines

| Surface | Max chars |
|---|---|
| CTA button | 18 |
| Toast | 60 |
| Hero subtitle | 110 |
| Empty state title | 24 |
| Empty state description | 70 |
| Error toast | 60 |

If you can't fit it, the message is doing too much. Cut, don't shrink.

---

## 7. Examples by surface

**CTAs**
- ✅ "Rejoins le club" / "Rejoins-nous!" / "Join the crew!"
- ❌ "Cliquez ici pour vous inscrire"

**Login title**
- ✅ "Yo, te revoila!" / "Wa, rj3ti!" / "Yo, welcome back!"
- ❌ "Connexion a votre compte"

**Toast error**
- ✅ "Maj ratee. Retry?"
- ❌ "Erreur lors de la mise a jour"

**Empty state**
- ✅ "Pas encore de reservation. Va checker l'agenda, y a du lourd."
- ❌ "Vous n'avez pas encore de reservations. Explorez nos evenements !"

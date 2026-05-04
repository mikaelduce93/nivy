# 🚀 État du Système Agentique & Roadmap "Best Seller 2026"

> **Diagnostic Actuel :** Nous avons une **Architecture Technique** moderne (Vercel AI SDK, Streaming), mais une **Intelligence Métier** encore embryonnaire. C'est une "Coquille vide performante".

## ✅ CE QUI EST FAIT (L'Infrastructure)

1.  **Architecture Temps Réel ⚡**
    *   Mise en place du `streamText` pour des réponses instantanées (<100ms).
    *   Migration vers `@ai-sdk/react` pour la gestion d'état fluide.
    *   Support du "Native Tool Calling" (L'IA sait *quand* et *comment* cliquer sur les boutons à votre place).

2.  **Intégration UI/UX 🎨**
    *   `AgentSheet` intégré dans tous les layouts (Teen, Parent, Partner, etc.).
    *   Design réactif avec indicateurs d'action ("✅ Action effectuée").
    *   Moteur de Contexte (`ContextEngine`) qui injecte automatiquement les données de la page.

3.  **Fondations Back-end 🔧**
    *   Route API Edge-ready (`app/api/agent/action`).
    *   Définition typée des outils (Zod schemas) pour `performCheckIn`, `updateBudget`, etc.

---

## 🚧 CE QU'IL RESTE À FAIRE (Pour être "Product Ready")

Pour passer du "Prototype" au "Best Seller", nous devons travailler sur 4 axes critiques :

### 1. Cerveau & Intelligence (Le plus important)
*   [ ] **Prompts Système Avancés :** Le prompt actuel est générique. Il faut rédiger un "Persona" détaillé pour chaque agent (ex: Kai doit parler comme un ado, Aura doit être rassurante et formelle).
*   [ ] **RAG (Retrieval Augmented Generation) :** L'IA doit pouvoir lire la FAQ et la documentation du projet pour répondre aux questions précises ("Comment fonctionne le remboursement ?").
*   [ ] **Mémoire Long Terme :** L'agent doit se souvenir des conversations passées ("Comme je t'ai dit hier..."). Actuellement, tout est oublié au refresh.

### 2. Actions Réelles & Deep Backend
*   [ ] **Connexion DB Réelle :** Remplacer les mocks dans `agent-actions.ts` par de vraies requêtes Supabase (Insertions dans `transactions`, `bookings`, `audit_logs`).
*   [ ] **Garde-fous (Guardrails) :** Empêcher l'IA de valider des budgets absurdes ou des offres à perte. Validation stricte côté serveur.

### 3. La "Killer Feature" : La Voix 🎙️
*   [ ] **Vrai Speech-to-Text :** Le bouton micro est inactif. Il faut intégrer l'API Web Speech (gratuit) ou Whisper (payant/premium) pour que l'on puisse *vraiment* parler.
*   [ ] **Text-to-Speech (TTS) :** L'agent doit pouvoir répondre vocalement (optionnel mais "Waouh effect").

### 4. Robustesse & Analytics
*   [ ] **Gestion des Erreurs :** Que se passe-t-il si l'outil échoue ? L'IA doit savoir gérer l'erreur ("Désolé, je n'ai pas pu valider le check-in car...").
*   [ ] **Feedback Loop :** Ajouter des boutons 👍/👎 sous les réponses pour améliorer le modèle.

---

## 📅 PLAN D'ATTAQUE SUGGÉRÉ

1.  **Priorité 1 : Connecter le Backend (Jours 1-2)**
    *   Implémenter la vraie logique DB pour `performCheckIn` et `updateBudgetLimit`.
2.  **Priorité 2 : Spécialiser les Prompts (Jour 3)**
    *   Créer des fichiers de prompts dédiés par rôle (`lib/ai/prompts/teen.ts`, etc.).
3.  **Priorité 3 : Activer la Voix (Jour 4)**
    *   Brancher `react-speech-recognition` sur le bouton micro.

**On commence par la Priorité 1 (Backend Réel) ?**

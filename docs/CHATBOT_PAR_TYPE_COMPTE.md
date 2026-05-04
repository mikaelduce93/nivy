# 🧠 VISION 2026: L'ÈRE DES AGENTS IA PROACTIFS (TEENS PARTY)

> **Note du C.I.O (Chief Innovation Officer):**
> Le concept de "Chatbot" est obsolète en 2026. Nous ne construisons pas une FAQ interactive.
> Nous construisons des **Agents IA "Agentiques"** : des partenaires proactifs, vocaux et multimodaux qui *agissent* au lieu d'attendre des questions.

## 1. Philosophie "Agentic First"
Au lieu d'attendre que l'utilisateur pose une question ("Comment gagner des XP ?"), l'Agent **anticipe le besoin** et **propose une action** ("Tu es à 500m d'un Event Partenaire. Check-in maintenant pour +200 XP ?").

### Les 4 Piliers de l'Innovation 2026
1.  **Voice-Native 🎙️:** L'interaction par défaut est la voix (mode talkie-walkie). Pas de clavier nécessaire en déplacement.
2.  **Hyper-Contextuel 📍:** L'IA connaît la position, l'heure, la météo, le solde, les amis à proximité et l'état émotionnel (via analyse de texte/voix).
3.  **Action-Oriented ⚡:** L'IA ne donne pas de tutoriels. Elle pré-remplit les formulaires, configure les actions et demande juste "Confirmer ?".
4.  **Multimodal 📸:** "Montre-moi ce que tu vois". L'IA analyse les photos (ex: scan de menu, affiche de concert) pour enrichir l'expérience.

---

## 2. DÉCLINAISON PAR RÔLE (LES "KILLER AGENTS")

### 👤 TEEN: "KAI" - Le Coach de Vie Gamifié
**Mission:** Transformer la vie réelle en RPG. Kai n'est pas un assistant, c'est un "Sidekick".

#### 🌟 Fonctionnalités Innovantes
*   **📍 Geo-Questing Proactif:**
    *   *Contexte:* Le teen marche près d'un parc partenaire.
    *   *Action:* Notification vocale "Hey ! Tu es à 2 min du Skatepark. Il y a 3 membres de ton Cercle là-bas. Check-in pour 50 XP ?"
    *   *Integration:* `app/teen/map/page.tsx` + Geofencing Service.
*   **💸 Smart-Spending Coach:**
    *   *Contexte:* Le teen veut acheter un pass VIP.
    *   *Action:* "Attends ! Si tu attends samedi, c'est -20%. En attendant, voici une mission pour gagner les 10 coins qui te manquent."
    *   *Integration:* `app/teen/shop/page.tsx` + `features/payments`.
*   **📚 Peer-Tutor Matchmaker:**
    *   *Contexte:* Note basse en Maths détectée.
    *   *Action:* "J'ai vu ton C- en Maths. Sara (Niveau 50) cherche un binôme pour réviser et elle habite à 1km. Je vous connecte ?"
    *   *Integration:* `app/teen/academic/page.tsx` + Social Graph.
*   **📸 Reality Scanner:**
    *   *Action:* Le teen prend en photo une affiche de concert. Kai l'analyse, trouve l'event dans la DB, et propose "Je l'ajoute à ton calendrier et je notifie ta bande ?"

#### 🎨 Intégration UI
*   **Avatar 3D Vivant:** En bas à droite, réagit aux émotions (saute quand XP gagné, dort la nuit).
*   **Mode "Walkie-Talkie":** Bouton central flottant. Appui long pour parler.

---

### 🛡️ PARENT: "AURA" - Le Gardien Invisible
**Mission:** Sérénité totale sans intrusion excessive. Aura gère la sécurité et l'éducation financière.

#### 🌟 Fonctionnalités Innovantes
*   **🚨 Predictive Safety Radar:**
    *   *Contexte:* L'enfant est à un event, batterie à 10%, il est 23h.
    *   *Action:* "Alerte préventive : La batterie d'Amine est faible. Il est encore au Club XYZ. Voulez-vous que je pré-commande un Uber Partenaire pour 23h30 ?"
    *   *Integration:* `app/parent/live/page.tsx` + Battery API + Partner Transport.
*   **💳 Financial Guardian:**
    *   *Contexte:* Tentative d'achat suspecte ou rapide.
    *   *Action:* "Amine dépense beaucoup en fast-food cette semaine (40%). Je peux lui proposer un 'Défi Santé' (Cuisiner un repas) contre un bonus d'argent de poche. On lance ?"
    *   *Integration:* `app/parent/budget/page.tsx` + `features/payments`.
*   **🗣️ "Translator" Parent-Ado:**
    *   *Contexte:* Le parent veut refuser une sortie.
    *   *Action:* Parent dit "Non c'est trop tard". Aura propose : "Voici une version plus constructive : 'C'est un peu tard pour une veille d'examen, mais OK pour samedi prochain ?'. Envoyer ?"

#### 🎨 Intégration UI
*   **Dashboard "Pulse":** Un cercle de couleur (Vert/Orange/Rouge) résumant l'état global (Localisation, Batterie, Budget).
*   **Briefing Vocal Matinal:** "Tout est calme. 2 sorties prévues ce week-end, budget OK. Une demande en attente."

---

### 🤝 PARTNER: "BIZ-BOOST" - Le Directeur Marketing Auto
**Mission:** Remplir l'établissement et maximiser le revenu sans effort manuel.

#### 🌟 Fonctionnalités Innovantes
*   **📉 Dynamic Yield Management:**
    *   *Contexte:* Il pleut, le club est vide à 16h.
    *   *Action:* "Il pleut et le trafic est faible. Je peux lancer une 'Flash Offer' (-30% pour les 50 premiers arrivés) aux Teens dans un rayon de 5km. Go ?"
    *   *Integration:* `app/partner/dashboard/page.tsx` + Weather API + Push Notifs.
*   **🤳 Auto-Insta Studio:**
    *   *Contexte:* Un event se termine avec 200 check-ins.
    *   *Action:* "Gros succès ! J'ai monté une vidéo de 15s avec les stats de la soirée et des photos publiques. Prêt à poster sur Instagram ?"
    *   *Integration:* `components/partner/universal-scanner.tsx` + Media Gen.
*   **🕵️ Competitor Watch:**
    *   *Action:* "Le Bowling concurrent est complet. Augmentons votre visibilité sur la map pour capter les refusés."

#### 🎨 Intégration UI
*   **"The Big Red Button":** Une action recommandée majeure affichée en gros (ex: "Lancer Promo Pluie").
*   **Scanner Vocal:** Le partenaire dit juste "Check Amine", l'IA valide le scan sans toucher l'écran.

---

### 🌟 AMBASSADOR: "HYPE-MASTER" - L'Agent Viral
**Mission:** Maximiser l'influence et les commissions via la créativité assistée.

#### 🌟 Fonctionnalités Innovantes
*   **📈 Trend Surfer:**
    *   *Contexte:* Une nouvelle danse ou challenge est viral sur TikTok.
    *   *Action:* "La trend 'Moonwalk Challenge' explose. Voici un script vidéo adapté pour promouvoir le Pass VIP TeenClub. Tu le tournes ?"
    *   *Integration:* `app/ambassador/marketing/page.tsx` + Social Trends API.
*   **💰 Commission Forecaster:**
    *   *Action:* "Tu es à 2 parrainages du bonus 'Silver'. Si tu partages ton code maintenant avec ces 3 amis inactifs, tu as 80% de chances de l'atteindre ce soir."
    *   *Integration:* `app/ambassador/commissions/page.tsx` + CRM.
*   **🎙️ Voice-to-Post:**
    *   *Action:* L'ambassadeur raconte sa journée en audio. L'IA génère 3 posts (Story, Tweet, LinkedIn) optimisés et hashtagués.

---

### 🔧 ADMIN/SUPPORT: "OPS-COMMANDER" - L'Omniscient
**Mission:** Maintenance prédictive et résolution instantanée.

#### 🌟 Fonctionnalités Innovantes
*   **🔮 Anomaly Radar:**
    *   *Contexte:* Pic anormal d'inscriptions depuis une IP suspecte.
    *   *Action:* "Détection de fraude potentielle (Botnet). J'ai suspendu préventivement les 50 comptes suspects. Valider le ban définitif ?"
    *   *Integration:* `app/admin/page.tsx` + Security Logs.
*   **🧠 Support Clone:**
    *   *Contexte:* Ticket complexe d'un parent en colère.
    *   *Action:* L'IA rédige une réponse empathique, vérifie l'historique client, calcule une compensation possible (ex: 1 mois offert) et demande validation à l'agent humain.
*   **⚡ Self-Healing SQL:**
    *   *Contexte:* Une requête est lente.
    *   *Action:* "L'index sur `user_points` est manquant. Je peux l'ajouter sans downtime. Go ?"

---

## 3. ARCHITECTURE TECHNIQUE "AGENTIC" (MVP)

### Composants Clefs
1.  **`components/ai/AgentFloatingButton.tsx`**: Le point d'entrée visuel (micro/chat).
2.  **`components/ai/AgentSheet.tsx`**: Le panneau latéral qui affiche le contexte et les actions.
3.  **`lib/ai/context-engine.ts`**: Le moteur qui agrège les données (User, Location, DB) pour nourrir le prompt.
4.  **`app/api/agent/action/route.ts`**: L'API qui exécute les actions réelles (Booking, Transfert, Post).

### Flux de Données
1.  **Trigger:** Voix, Texte ou Event Système (Cron/Geo).
2.  **Context Assembly:** Récupération profil + contexte page actuelle.
3.  **LLM Decision (Brain):** (GPT-4o / Claude 3.5) Décide de l'action ou de la réponse.
4.  **Action Execution:** Appel des fonctions internes (via Tool Calling).
5.  **Feedback UI:** Mise à jour de l'interface en temps réel (Optimistic UI).

---

## 4. PROCHAINES ÉTAPES (PRIORITÉ C.I.O)

1.  **Proto "Kai" (Teen):** Implémenter le `AgentFloatingButton` dans `app/teen/layout.tsx`.
2.  **Mock Scenarios:** Coder 3 scénarios fixes (Geo-Quest, Smart-Spending, Peer-Tutor) pour démo.
3.  **Voice Integ:** Intégrer l'API Web Speech ou un service tiers (ElevenLabs/OpenAI Audio) pour le Speech-to-Text.

> **Conclusion:** En 2026, l'IA ne répond pas. Elle *suggère*, *agit* et *amplifie* les capacités humaines. C'est ça, la vraie innovation.

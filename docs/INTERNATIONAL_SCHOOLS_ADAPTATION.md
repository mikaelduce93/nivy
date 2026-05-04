# Adaptation pour Écoles Privées Internationales au Maroc

## 🎯 Cible Réelle

**Pas** le programme public marocain, mais :
- ✅ **Écoles françaises** (Lycée Français, Collège Français, etc.)
- ✅ **Écoles américaines** (American School, Academy, etc.)
- ✅ **Écoles britanniques** (British School, British International)
- ✅ **Écoles IB** (International Baccalaureate)
- ✅ **Autres écoles internationales**

## 🔍 Détection Automatique

Le système détecte automatiquement le type d'école depuis le nom :

```typescript
// Exemples de détection
"Lycée Français de Casablanca" → french
"American School of Casablanca" → american
"British International School" → british
"IB School Rabat" → ib
```

## 📚 Matières par Programme

### Programme Français
- Mathématiques, Français, Anglais, Espagnol
- Physique-Chimie, SVT
- Histoire-Géographie, Philosophie, SES
- Arts Plastiques, Éducation Musicale, EPS

### Programme Américain
- Mathematics, English Language Arts
- Science, Biology, Chemistry, Physics
- History, Social Studies
- French, Spanish
- Art, Music, Physical Education, Computer Science

### Programme Britannique
- Mathematics, English
- Science, Biology, Chemistry, Physics
- History, Geography
- French, Spanish
- Art & Design, Music, Physical Education

## 🎓 Niveaux par Programme

### Français
- CM2, 6ème, 5ème, 4ème, 3ème, 2nde, 1ère, Terminale

### Américain
- Grade 5, Grade 6, Grade 7, Grade 8, Grade 9, Grade 10, Grade 11, Grade 12

### Britannique
- Year 6, Year 7, Year 8, Year 9, Year 10, Year 11, Year 12, Year 13

## 🔧 Adaptation du Contenu

Le système adapte automatiquement :

1. **Matières disponibles** selon le programme
2. **Niveaux** selon le système (6ème vs Grade 6)
3. **Terminologie** (Mathématiques vs Mathematics)
4. **Langue** (français vs anglais)
5. **Contenu** adapté au curriculum

## 📊 Exemple Concret

### Teen : Sarah, 14 ans
- **École** : "Lycée Français de Casablanca"
- **Niveau** : "3ème"
- **Détection** : `french` (Programme Français)

**Génération :**
- ✅ Matières : Mathématiques, Français, Physique-Chimie, SVT, etc.
- ✅ Niveaux : 6ème, 5ème, 4ème, 3ème, 2nde, 1ère, Terminale
- ✅ Langue : Français
- ✅ Contenu : Adapté au programme français

### Teen : Alex, 15 ans
- **École** : "American School of Rabat"
- **Niveau** : "Grade 10"
- **Détection** : `american` (American Curriculum)

**Génération :**
- ✅ Matières : Mathematics, English, Biology, Chemistry, etc.
- ✅ Niveaux : Grade 6, Grade 7, ..., Grade 12
- ✅ Langue : Anglais
- ✅ Contenu : Adapté au programme américain

## 🚀 Utilisation

```typescript
import { InternationalSchoolEngine } from "@/lib/ai/international-school-engine"

const engine = new InternationalSchoolEngine()

// Génère du contenu adapté automatiquement
const content = await engine.generateInternationalContent({
  teenId: "uuid",
  pillar: "school",
  targetXP: 1500 // Pour une soirée gratuite (150 DH)
})
```

## ✅ Avantages

1. **Détection automatique** du type d'école
2. **Adaptation intelligente** du contenu
3. **Support multi-curriculums** sans configuration manuelle
4. **Respect des spécificités** de chaque programme
5. **Génération personnalisée** selon le teen



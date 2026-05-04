# 🧪 Tests de Génération de Quiz

## Comment tester le nouveau système

### Option 1: Via l'API de test (Recommandé)

1. **Démarrer le serveur de développement:**
```bash
npm run dev
```

2. **Appeler l'endpoint de test:**
```bash
curl http://localhost:3000/api/test/quiz-generation
```

Ou ouvrir dans le navigateur:
```
http://localhost:3000/api/test/quiz-generation
```

### Option 2: Via les fonctions de test TypeScript

```typescript
import { runAllTests } from '@/lib/ai/test-quiz-generation'

// Exécuter tous les tests
const results = await runAllTests()
console.log(results)
```

## Tests effectués

### ✅ Test 1: Prompts enrichis
- Vérifie que les prompts contiennent les instructions en français
- Vérifie la présence du contexte marocain
- Vérifie l'intégration des intérêts

### ✅ Test 2: Intégration des intérêts
- Vérifie que les intérêts sont mappés aux matières
- Vérifie la création d'un prompt personnalisé
- Teste les suggestions de matières

### ✅ Test 3: Parser JSON robuste
- Teste le parsing de JSON valide
- Teste le parsing de JSON avec markdown
- Teste le parsing de JSON avec texte autour

### ✅ Test 4: Validation factuelle
- Vérifie la validation d'un quiz valide
- Vérifie la détection d'erreurs dans un quiz invalide
- Teste le scoring de qualité

### ✅ Test 5: Vérification langue française
- Vérifie la détection de texte en français
- Vérifie la détection de texte en anglais
- Teste la pénalité pour contenu non-français

## Résultat attendu

Tous les tests devraient passer (5/5) avec:
- ✅ Prompts enrichis avec contexte marocain
- ✅ Intégration intelligente des intérêts
- ✅ Parser JSON robuste (gère les erreurs)
- ✅ Validation factuelle fonctionnelle
- ✅ Vérification langue française active

## Exemple de réponse API

```json
{
  "success": true,
  "message": "Tests de génération de quiz terminés",
  "results": {
    "test1_prompts": {
      "success": true,
      "hasFrenchInstruction": true,
      "hasMoroccanContext": true,
      "hasInterests": true
    },
    "test2_interests": {
      "success": true,
      "hasCustomPrompt": true,
      "hasSubject": true
    },
    "test3_parser": {
      "success": true,
      "validJSONParsed": true,
      "markdownJSONParsed": true
    },
    "test4_validation": {
      "success": true,
      "score": 95,
      "isValid": true
    },
    "test5_french": {
      "success": true,
      "frenchTextDetected": true,
      "englishTextDetected": false
    },
    "summary": {
      "totalTests": 5,
      "passedTests": 5,
      "successRate": "100%",
      "allPassed": true
    }
  }
}
```

## Prochaines étapes

Une fois les tests passés, vous pouvez:
1. Tester la génération réelle avec l'API OpenAI/Claude
2. Vérifier que les quiz générés sont en français
3. Vérifier que les intérêts sont bien intégrés
4. Vérifier la qualité des quiz générés

## Dépannage

Si un test échoue:
1. Vérifier les logs dans la console
2. Vérifier que tous les fichiers sont bien importés
3. Vérifier que les types TypeScript sont corrects
4. Vérifier les variables d'environnement si nécessaire




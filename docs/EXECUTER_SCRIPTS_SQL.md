# Guide d'exécution des scripts SQL

## Pourquoi exécuter manuellement ?

Les scripts SQL ne peuvent pas être exécutés automatiquement via l'API pour des raisons de sécurité. Supabase n'autorise pas l'exécution de SQL arbitraire depuis le client.

## Méthode 1: Via Supabase Dashboard (Recommandé)

### Étape 1: Accéder au SQL Editor

1. Allez sur https://supabase.com et connectez-vous
2. Sélectionnez votre projet "Teens Party Morocco"
3. Dans le menu gauche, cliquez sur **"SQL Editor"**

### Étape 2: Exécuter les scripts dans l'ordre

Copiez-collez le contenu de chaque script ci-dessous dans l'éditeur SQL et cliquez sur **"Run"**.

**⚠️ IMPORTANT: Exécutez dans cet ordre exact:**

#### Script 105: Tables DJs et Contenu
\`\`\`sql
-- Copiez tout le contenu de scripts/105_create_djs_and_campaigns.sql
-- Ce script crée les tables: djs, influencer_campaigns, photo_galleries, gallery_photos, blog_posts, faq_categories, faq_questions, testimonials
\`\`\`

#### Script 106: Données de démonstration
\`\`\`sql
-- Copiez tout le contenu de scripts/106_seed_djs_and_content.sql
-- Ce script ajoute 4 DJs, 4 campagnes, albums photos, 3 articles de blog, FAQ complète, 3 témoignages
\`\`\`

#### Script 107: Sécurité RLS
\`\`\`sql
-- Copiez tout le contenu de scripts/107_add_critical_rls_policies.sql
-- Ce script ajoute les policies RLS pour documents, authorizations, admin
\`\`\`

#### Script 108: Fonctionnalités opérationnelles
\`\`\`sql
-- Copiez tout le contenu de scripts/108_add_operational_features.sql
-- Ce script améliore check-in, ajoute e-signature, purge automatique
\`\`\`

#### Script 109: Paiements Maroc
\`\`\`sql
-- Copiez tout le contenu de scripts/109_add_morocco_payments.sql
-- Ce script ajoute CMI, Mobile Money, Cash ambassadeurs
\`\`\`

### Étape 3: Vérification

Après chaque script, vérifiez qu'il n'y a pas d'erreurs dans le panneau de sortie.

Si un script échoue:
- Lisez le message d'erreur
- Vérifiez que les scripts précédents ont bien été exécutés
- Certaines tables peuvent déjà exister (c'est normal)

## Méthode 2: Via CLI Supabase (Avancé)

Si vous avez le CLI Supabase installé:

\`\`\`bash
# Se connecter à votre projet
supabase login

# Lier le projet
supabase link --project-ref jyixeidmuvecienbkkrw

# Exécuter les scripts
supabase db execute --file scripts/105_create_djs_and_campaigns.sql
supabase db execute --file scripts/106_seed_djs_and_content.sql
supabase db execute --file scripts/107_add_critical_rls_policies.sql
supabase db execute --file scripts/108_add_operational_features.sql
supabase db execute --file scripts/109_add_morocco_payments.sql
\`\`\`

## Vérifier que tout est OK

Après l'exécution, vérifiez dans l'éditeur SQL:

\`\`\`sql
-- Vérifier que les tables existent
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('djs', 'blog_posts', 'testimonials', 'faq_questions', 'photo_galleries');

-- Vérifier les données de démo
SELECT COUNT(*) as nb_djs FROM djs;
SELECT COUNT(*) as nb_blog_posts FROM blog_posts;
SELECT COUNT(*) as nb_testimonials FROM testimonials;
\`\`\`

Vous devriez voir:
- 4 DJs
- 3 articles de blog
- 3 témoignages
- 8+ catégories FAQ

## En cas d'erreur

**"relation already exists"**
→ Normal, la table existe déjà. Continuez avec le script suivant.

**"permission denied"**
→ Vérifiez que vous êtes connecté en tant qu'administrateur.

**"column does not exist"**
→ Un script précédent n'a pas été exécuté correctement. Recommencez depuis le début.

## Support

Si vous rencontrez des problèmes, vérifiez:
1. Que vous êtes sur le bon projet Supabase
2. Que vous avez les permissions admin
3. Que les scripts sont copiés entièrement (sans coupures)

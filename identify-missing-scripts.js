const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const supabaseUrl = 'https://jyixeidmuvecienbkkrw.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp5aXhlaWRtdXZlY2llbmJra3J3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI3NjA3NjUsImV4cCI6MjA3ODMzNjc2NX0.A4P7USdP1HPa6hnDrzjriYTe5_N_bJEex0SkaAIMAME';

const supabase = createClient(supabaseUrl, supabaseKey);

// Tables qui DOIVENT exister selon le code de l'app
const requiredTables = [
  'profiles', 'children', 'events', 'bookings', 'booking_tickets',
  'clubs', 'club_enrollments', 'ambassadors', 'partners',
  'loyalty_points', 'loyalty_transactions', 'reviews',
  'payment_transactions', 'documents', 'notifications',
  'event_statistics', 'admin_roles', 'cities', 'venues',
  'posts', 'comments'
];

async function checkTableExists(tableName) {
  const { data, error, count } = await supabase
    .from(tableName)
    .select('*', { count: 'exact', head: true });

  return !error;
}

async function checkTableColumn(tableName, columnName) {
  const { data, error } = await supabase
    .from(tableName)
    .select(columnName)
    .limit(1);

  return !error;
}

async function analyzeScriptNeeds() {
  console.log('🔍 ANALYSE DES SCRIPTS NÉCESSAIRES\n');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  // 1. Vérifier les tables manquantes
  console.log('📋 1. VÉRIFICATION DES TABLES REQUISES:\n');

  const missingTables = [];
  const existingTables = [];

  for (const table of requiredTables) {
    const exists = await checkTableExists(table);
    if (exists) {
      existingTables.push(table);
    } else {
      missingTables.push(table);
    }
  }

  console.log(`✅ Tables existantes: ${existingTables.length}/${requiredTables.length}`);
  console.log(`❌ Tables manquantes: ${missingTables.length}/${requiredTables.length}\n`);

  if (missingTables.length > 0) {
    console.log('⚠️  TABLES MANQUANTES:\n');
    for (const table of missingTables) {
      console.log(`   ❌ ${table}`);
    }
    console.log('');
  }

  // 2. Identifier les scripts qui créent ces tables
  console.log('\n📄 2. SCRIPTS À EXÉCUTER POUR CRÉER LES TABLES MANQUANTES:\n');

  const scriptNeeded = [];

  if (missingTables.includes('documents')) {
    scriptNeeded.push({
      file: '007_create_documents_table.sql',
      reason: 'Crée la table documents',
      priority: 'CRITIQUE'
    });
  }

  if (missingTables.includes('admin_roles')) {
    scriptNeeded.push({
      file: '010_create_admin_tables.sql',
      reason: 'Crée les tables admin_roles, notifications, support_tickets',
      priority: 'CRITIQUE'
    });
  }

  // 3. Vérifier les colonnes potentiellement manquantes dans les tables existantes
  console.log('\n📊 3. VÉRIFICATION DES COLONNES CRITIQUES:\n');

  const columnChecks = [
    { table: 'events', column: 'category', script: '104_add_event_category.sql' },
    { table: 'events', column: 'stripe_price_id', script: '103_add_stripe_fields.sql' },
    { table: 'ambassadors', column: 'status', script: '110_fix_ambassadors_status.sql' },
    { table: 'payment_transactions', column: 'morocco_payment_method', script: '109_add_morocco_payments.sql' }
  ];

  const missingColumns = [];

  for (const check of columnChecks) {
    const tableExists = await checkTableExists(check.table);
    if (tableExists) {
      const columnExists = await checkTableColumn(check.table, check.column);
      if (!columnExists) {
        console.log(`   ⚠️  ${check.table}.${check.column} - MANQUANTE`);
        missingColumns.push(check);
        scriptNeeded.push({
          file: check.script,
          reason: `Ajoute la colonne ${check.column} à ${check.table}`,
          priority: 'IMPORTANT'
        });
      } else {
        console.log(`   ✅ ${check.table}.${check.column} - OK`);
      }
    }
  }

  // 4. Résumé des scripts à exécuter
  console.log('\n\n🎯 RÉSUMÉ - SCRIPTS À EXÉCUTER:\n');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  if (scriptNeeded.length === 0) {
    console.log('✅ Aucun script critique à exécuter!\n');
    console.log('   Toutes les tables et colonnes nécessaires existent.\n');
  } else {
    // Grouper par priorité
    const critical = scriptNeeded.filter(s => s.priority === 'CRITIQUE');
    const important = scriptNeeded.filter(s => s.priority === 'IMPORTANT');

    if (critical.length > 0) {
      console.log('🚨 CRITIQUES (à exécuter en priorité):\n');
      critical.forEach((s, i) => {
        console.log(`   ${i + 1}. ${s.file}`);
        console.log(`      └─ ${s.reason}\n`);
      });
    }

    if (important.length > 0) {
      console.log('\n⭐ IMPORTANTS (recommandés):\n');
      important.forEach((s, i) => {
        console.log(`   ${i + 1}. ${s.file}`);
        console.log(`      └─ ${s.reason}\n`);
      });
    }
  }

  // 5. Instructions
  console.log('\n📝 INSTRUCTIONS POUR EXÉCUTER LES SCRIPTS:\n');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  console.log('Option 1 - Via SQL Editor (Recommandé):');
  console.log('  1. Allez sur: https://supabase.com/dashboard/project/jyixeidmuvecienbkkrw/sql');
  console.log('  2. Créez une nouvelle query');
  console.log('  3. Copiez-collez le contenu d\'un script');
  console.log('  4. Cliquez sur "Run"\n');

  if (scriptNeeded.length > 0) {
    console.log('Option 2 - Scripts à exécuter dans l\'ordre:\n');
    scriptNeeded.forEach((s, i) => {
      console.log(`  ${i + 1}. scripts/${s.file}`);
    });
  }

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  return { missingTables, missingColumns, scriptNeeded };
}

async function main() {
  console.log('🚀 DIAGNOSTIC COMPLET DE LA BASE DE DONNÉES');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  const results = await analyzeScriptNeeds();

  console.log('\n✅ Analyse terminée!\n');
}

main().catch(console.error);

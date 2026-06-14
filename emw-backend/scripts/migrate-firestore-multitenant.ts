/**
 * Migración Firestore: chats/{phone} → accounts/{accountId}/chats/{phone}
 *
 * Lee todas las conversaciones existentes en la colección "chats",
 * mapea cada una a su cuenta WhatsApp por userId,
 * y copia todo al nuevo path multi-tenant.
 *
 * Uso: npx ts-node scripts/migrate-firestore-multitenant.ts
 */

import * as admin from 'firebase-admin';
import * as path from 'path';

// ─── Config ─────────────────────────────────────────────────
const serviceAccountPath = path.join(__dirname, '..', 'config', 'firebase-service-account.json');
const serviceAccount = require(serviceAccountPath);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();

// Mapeo userId → accountId (de la query PostgreSQL)
const USER_ACCOUNT_MAP: Record<string, string> = {
  '08dedfd1-feee-4098-b5c3-61ec7c8f539b': '9f0a7b5d-d1c2-4d47-862d-78f04a9715e7', // 743177541504666
  '0290ecd2-64da-4d88-94d7-0ae645d656fa': '2b3269e5-ca05-4da5-8460-5fa420e78bdb', // EMW SIETE
  '7f224e90-6488-44b0-803e-86ff930f5523': 'c100c7b8-13a4-4b80-ba8e-8f5aed78527a', // Finca Directa
};

// ─── Migración ──────────────────────────────────────────────
async function migrate() {
  console.log('🔄 Iniciando migración multi-tenant de Firestore...\n');

  // 1. Leer todas las conversaciones del path viejo: chats/{phone}
  const chatsSnap = await db.collection('chats').get();
  console.log(`📦 Encontradas ${chatsSnap.size} conversaciones en chats/\n`);

  if (chatsSnap.empty) {
    console.log('✅ No hay datos que migrar. Terminando.');
    return;
  }

  let migratedConvs = 0;
  let migratedMsgs = 0;
  let skippedConvs = 0;

  for (const chatDoc of chatsSnap.docs) {
    const phone = chatDoc.id;
    const chatData = chatDoc.data();
    const userId = chatData.userId;

    if (!userId) {
      console.warn(`⚠️  Chat ${phone}: sin userId, no se puede mapear. Saltando.`);
      skippedConvs++;
      continue;
    }

    const accountId = USER_ACCOUNT_MAP[userId];
    if (!accountId) {
      console.warn(`⚠️  Chat ${phone}: userId=${userId} no mapeado a ninguna cuenta. Saltando.`);
      skippedConvs++;
      continue;
    }

    // 2. Copiar el documento de conversación al nuevo path
    const newChatRef = db.doc(`accounts/${accountId}/chats/${phone}`);
    const newChatData = { ...chatData };
    // Asegurar que tenga whatsappAccountId
    newChatData.whatsappAccountId = accountId;
    await newChatRef.set(newChatData);
    migratedConvs++;

    // 3. Copiar todos los mensajes de esta conversación
    const messagesSnap = await db.collection(`chats/${phone}/messages`).get();
    console.log(`  📨 ${phone} → accounts/${accountId}/chats/${phone} (${messagesSnap.size} mensajes)`);

    // Batch writes (max 500 por batch)
    const batches: admin.firestore.WriteBatch[] = [];
    let currentBatch = db.batch();
    let opCount = 0;

    for (const msgDoc of messagesSnap.docs) {
      const newMsgRef = db.doc(`accounts/${accountId}/chats/${phone}/messages/${msgDoc.id}`);
      currentBatch.set(newMsgRef, msgDoc.data());
      opCount++;
      migratedMsgs++;

      if (opCount >= 450) {
        batches.push(currentBatch);
        currentBatch = db.batch();
        opCount = 0;
      }
    }

    if (opCount > 0) {
      batches.push(currentBatch);
    }

    for (const batch of batches) {
      await batch.commit();
    }
  }

  console.log('\n────────────────────────────────────────');
  console.log(`✅ Migración completada:`);
  console.log(`   Conversaciones migradas: ${migratedConvs}`);
  console.log(`   Mensajes migrados:       ${migratedMsgs}`);
  console.log(`   Conversaciones saltadas:  ${skippedConvs}`);
  console.log('────────────────────────────────────────\n');
}

migrate().catch((err) => {
  console.error('❌ Error en migración:', err);
  process.exit(1);
});

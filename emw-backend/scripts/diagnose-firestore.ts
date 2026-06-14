/**
 * Diagnóstico: lee las conversaciones del nuevo path multi-tenant
 */
import * as admin from 'firebase-admin';
import * as path from 'path';

const serviceAccountPath = path.join(__dirname, '..', 'config', 'firebase-service-account.json');
const serviceAccount = require(serviceAccountPath);

if (admin.apps.length === 0) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}

const db = admin.firestore();

async function diagnose() {
  const accountId = '2b3269e5-ca05-4da5-8460-5fa420e78bdb'; // EMW SIETE
  const userId = '0290ecd2-64da-4d88-94d7-0ae645d656fa';    // Jaime

  console.log('1️⃣ Leyendo ALL docs en accounts/{accountId}/chats/ ...');
  const allChats = await db.collection(`accounts/${accountId}/chats`).get();
  console.log(`   Total: ${allChats.size} documentos`);
  allChats.forEach(doc => {
    const d = doc.data();
    console.log(`   - ${doc.id}: userId=${d.userId}, lastMsg="${d.lastMessage?.substring(0, 40)}", lastAt=${d.lastMessageAt?.toDate?.()}`);
  });

  console.log('\n2️⃣ Query con where(userId) + orderBy(lastMessageAt, desc) ...');
  try {
    const filtered = await db.collection(`accounts/${accountId}/chats`)
      .where('userId', '==', userId)
      .orderBy('lastMessageAt', 'desc')
      .get();
    console.log(`   Resultados: ${filtered.size}`);
    filtered.forEach(doc => {
      const d = doc.data();
      console.log(`   - ${doc.id}: "${d.lastMessage?.substring(0, 40)}"`);
    });
  } catch (err: any) {
    console.error(`   ❌ Error en query: ${err.message}`);
    if (err.message?.includes('index')) {
      console.log('   → Se necesita un índice compuesto. Puede tardar unos minutos en crearse.');
    }
  }

  console.log('\n3️⃣ Leyendo mensajes de una conversación de ejemplo...');
  const firstChat = allChats.docs[0];
  if (firstChat) {
    const msgs = await db.collection(`accounts/${accountId}/chats/${firstChat.id}/messages`).get();
    console.log(`   Chat ${firstChat.id}: ${msgs.size} mensajes`);
  }
}

diagnose().catch(err => console.error('Error:', err));

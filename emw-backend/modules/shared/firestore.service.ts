import { Injectable, Logger } from '@nestjs/common';
import * as admin from 'firebase-admin';
import * as path from 'path';

export interface ChatMessage {
  content: string;
  direction: 'inbound' | 'outbound';
  type: 'text' | 'image' | 'document' | 'audio' | 'video' | 'template';
  status: 'pending' | 'sent' | 'delivered' | 'read' | 'failed';
  timestamp: admin.firestore.Timestamp;
  whatsappMessageId?: string;
  senderName?: string;
  mediaUrl?: string;
  mediaCaption?: string;
  templateName?: string;
}

export interface ChatConversation {
  customerName: string;
  phoneNumber: string;
  userId: string;
  lastMessage: string;
  lastMessageAt: admin.firestore.Timestamp;
  unreadCount: number;
  whatsappAccountId?: string;
}

@Injectable()
export class FirestoreService {
  private readonly logger = new Logger(FirestoreService.name);
  private db: admin.firestore.Firestore;

  constructor() {
    this.initFirestore();
  }

  private initFirestore() {
    try {
      if (admin.apps.length === 0) {
        const serviceAccountPath = path.join(
          process.cwd(),
          'config/firebase-service-account.json',
        );
        const serviceAccount = require(serviceAccountPath);
        admin.initializeApp({
          credential: admin.credential.cert(serviceAccount),
          storageBucket: `${serviceAccount.project_id}.firebasestorage.app`,
        });
        this.logger.log('Firebase Admin inicializado desde FirestoreService');
      }
      this.db = admin.firestore();
      this.logger.log('✅ Firestore conectado');
    } catch (err: any) {
      this.logger.error(`❌ Error inicializando Firestore: ${err.message}`);
    }
  }

  /**
   * Escribe un mensaje en Firestore y actualiza la conversación padre.
   * Estructura multi-tenant: accounts/{accountId}/chats/{phone}/messages/{msgId}
   */
  async writeMessage(
    phoneNumber: string,
    message: ChatMessage,
    userId: string,
    customerName?: string,
    accountId?: string,
  ): Promise<string> {
    const normalizedPhone = phoneNumber.replace(/^\+/, '');
    const acctId = accountId || 'default';

    const chatRef = this.db
      .collection('accounts').doc(acctId)
      .collection('chats').doc(normalizedPhone);
    const messagesRef = chatRef.collection('messages');

    // Escribir mensaje — limpiar campos undefined (Firestore los rechaza)
    const cleanMessage: Record<string, any> = {
      timestamp: message.timestamp || admin.firestore.Timestamp.now(),
    };
    for (const [key, val] of Object.entries(message)) {
      if (val !== undefined) cleanMessage[key] = val;
    }
    const docRef = await messagesRef.add(cleanMessage);

    // Actualizar/crear documento de conversación
    const conversationData: Partial<ChatConversation> = {
      phoneNumber: normalizedPhone,
      userId,
      lastMessage: message.content || `[${message.type}]`,
      lastMessageAt: message.timestamp || admin.firestore.Timestamp.now(),
    };

    if (customerName) {
      conversationData.customerName = customerName;
    }

    // Incrementar unread solo si es inbound
    if (message.direction === 'inbound') {
      await chatRef.set(
        {
          ...conversationData,
          unreadCount: admin.firestore.FieldValue.increment(1),
        },
        { merge: true },
      );
    } else {
      await chatRef.set(conversationData, { merge: true });
    }

    this.logger.log(
      `📝 Firestore: mensaje ${docRef.id} escrito en accounts/${acctId}/chats/${normalizedPhone}`,
    );

    return docRef.id;
  }

  /**
   * Actualiza el status de un mensaje en Firestore buscando por whatsappMessageId.
   * Multi-tenant: busca dentro de accounts/{accountId}/chats/
   */
  async updateMessageStatus(
    whatsappMessageId: string,
    newStatus: string,
    timestamp?: Date,
    accountId?: string,
  ): Promise<boolean> {
    try {
      const acctId = accountId || 'default';
      const chatsRef = this.db
        .collection('accounts').doc(acctId)
        .collection('chats');
      const chatsSnapshot = await chatsRef.get();

      for (const chatDoc of chatsSnapshot.docs) {
        const messagesRef = chatDoc.ref.collection('messages');
        const msgQuery = await messagesRef
          .where('whatsappMessageId', '==', whatsappMessageId)
          .limit(1)
          .get();

        if (!msgQuery.empty) {
          const msgDoc = msgQuery.docs[0];
          await msgDoc.ref.update({
            status: newStatus,
            ...(timestamp
              ? { [`${newStatus}At`]: admin.firestore.Timestamp.fromDate(timestamp) }
              : {}),
          });
          this.logger.log(
            `📊 Firestore: status ${newStatus} para wamid=${whatsappMessageId} (account=${acctId})`,
          );
          return true;
        }
      }

      this.logger.debug(
        `Firestore: wamid=${whatsappMessageId} no encontrado en account=${acctId}`,
      );
      return false;
    } catch (err: any) {
      this.logger.error(
        `❌ Firestore updateMessageStatus error: ${err.message}`,
      );
      return false;
    }
  }

  /**
   * Marca la conversación como leída (reset unreadCount).
   * Multi-tenant: accounts/{accountId}/chats/{phone}
   */
  async markConversationRead(phoneNumber: string, accountId?: string): Promise<void> {
    const normalizedPhone = phoneNumber.replace(/^\+/, '');
    const acctId = accountId || 'default';
    const chatRef = this.db
      .collection('accounts').doc(acctId)
      .collection('chats').doc(normalizedPhone);
    await chatRef.set({ unreadCount: 0 }, { merge: true });
    this.logger.log(`✅ Conversación ${normalizedPhone} marcada como leída (account=${acctId})`);
  }

  /**
   * Lista conversaciones de un usuario, ordenadas por último mensaje.
   * Multi-tenant: accounts/{accountId}/chats/
   */
  async getConversations(
    userId: string,
    accountId?: string,
  ): Promise<(ChatConversation & { id: string })[]> {
    const acctId = accountId || 'default';
    const snapshot = await this.db
      .collection('accounts').doc(acctId)
      .collection('chats')
      .where('userId', '==', userId)
      .orderBy('lastMessageAt', 'desc')
      .get();

    return snapshot.docs.map((doc) => ({
      id: doc.id,
      ...(doc.data() as ChatConversation),
    }));
  }

  /**
   * Obtiene mensajes de una conversación (paginado).
   */
  async getMessages(
    phoneNumber: string,
    limit = 50,
    beforeTimestamp?: admin.firestore.Timestamp,
    accountId?: string,
  ): Promise<(ChatMessage & { id: string })[]> {
    const normalizedPhone = phoneNumber.replace(/^\+/, '');
    const acctId = accountId || 'default';
    let query = this.db
      .collection('accounts').doc(acctId)
      .collection('chats')
      .doc(normalizedPhone)
      .collection('messages')
      .orderBy('timestamp', 'desc')
      .limit(limit);

    if (beforeTimestamp) {
      query = query.startAfter(beforeTimestamp);
    }

    const snapshot = await query.get();
    return snapshot.docs
      .map((doc) => ({
        id: doc.id,
        ...(doc.data() as ChatMessage),
      }))
      .reverse(); // cronológico ascendente
  }
}

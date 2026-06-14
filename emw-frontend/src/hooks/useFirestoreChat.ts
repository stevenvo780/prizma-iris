import { useEffect, useState, useCallback } from 'react';
import {
  collection,
  query,
  orderBy,
  onSnapshot,
  doc,
  where,
  Timestamp,
} from 'firebase/firestore';
import { db } from '@/config/firebase';

export interface ChatMessage {
  id: string;
  content: string;
  direction: 'inbound' | 'outbound';
  type: string;
  status: string;
  timestamp: Timestamp | any;
  whatsappMessageId?: string;
  senderName?: string;
  mediaUrl?: string;
  mediaCaption?: string;
  templateName?: string;
}

export interface ChatConversation {
  id: string; // phoneNumber
  customerName: string;
  phoneNumber: string;
  userId: string;
  lastMessage: string;
  lastMessageAt: Timestamp | any;
  unreadCount: number;
}

/**
 * Hook para suscribirse a las conversaciones de un usuario en Firestore.
 * Multi-tenant: accounts/{accountId}/chats/
 */
export function useConversations(userId: string | null, accountId: string | null) {
  const [conversations, setConversations] = useState<ChatConversation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId || !accountId) {
      setConversations([]);
      setLoading(false);
      return;
    }

    const q = query(
      collection(db, 'accounts', accountId, 'chats'),
      where('userId', '==', userId),
      orderBy('lastMessageAt', 'desc'),
    );

    const unsub = onSnapshot(
      q,
      (snapshot) => {
        const convos: ChatConversation[] = snapshot.docs.map((d) => ({
          id: d.id,
          ...(d.data() as Omit<ChatConversation, 'id'>),
        }));
        setConversations(convos);
        setLoading(false);
      },
      (err) => {
        console.error('Firestore conversations error:', err);
        setLoading(false);
      },
    );

    return () => unsub();
  }, [userId, accountId]);

  return { conversations, loading };
}

/**
 * Hook para suscribirse a los mensajes de una conversación específica.
 * Multi-tenant: accounts/{accountId}/chats/{phone}/messages/
 */
export function useMessages(phoneNumber: string | null, accountId: string | null) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!phoneNumber || !accountId) {
      setMessages([]);
      setLoading(false);
      return;
    }

    const normalizedPhone = phoneNumber.replace(/^\+/, '');
    const q = query(
      collection(db, 'accounts', accountId, 'chats', normalizedPhone, 'messages'),
      orderBy('timestamp', 'asc'),
    );

    const unsub = onSnapshot(
      q,
      (snapshot) => {
        const msgs: ChatMessage[] = snapshot.docs.map((d) => ({
          id: d.id,
          ...(d.data() as Omit<ChatMessage, 'id'>),
        }));
        setMessages(msgs);
        setLoading(false);
      },
      (err) => {
        console.error('Firestore messages error:', err);
        setLoading(false);
      },
    );

    return () => unsub();
  }, [phoneNumber, accountId]);

  return { messages, loading };
}

/**
 * Formatea un Timestamp de Firestore a string legible.
 */
export function formatTimestamp(ts: Timestamp | any): string {
  if (!ts) return '';
  const date = ts?.toDate ? ts.toDate() : new Date(ts._seconds ? ts._seconds * 1000 : ts);
  const now = new Date();
  const isToday =
    date.getDate() === now.getDate() &&
    date.getMonth() === now.getMonth() &&
    date.getFullYear() === now.getFullYear();

  if (isToday) {
    return date.toLocaleTimeString('es-CO', {
      hour: '2-digit',
      minute: '2-digit',
    });
  }
  return date.toLocaleDateString('es-CO', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

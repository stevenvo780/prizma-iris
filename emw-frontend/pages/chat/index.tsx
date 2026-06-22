import React, { useState, useEffect, useRef, FC, useCallback } from 'react';
import SeoHead from '@components/SeoHead';
import { Container, Row, Col, Form, Button, Badge, Spinner } from 'react-bootstrap';
import { withAuthSync } from '@utils/auth';
import useUser from '@store/user';
import useUI from '@store/ui';
import {
  useConversations,
  useMessages,
  formatTimestamp,
  ChatConversation,
  ChatMessage as ChatMsg,
} from '@/hooks/useFirestoreChat';
import { sendChatMessage, markChatRead } from '@/api/chat';
import axios from '@utils/axios';
import { useActiveWhatsappAccount } from '@/hooks/useActiveWhatsappAccount';
import {
  FaPaperPlane,
  FaCommentDots,
  FaUser,
  FaSearch,
  FaCheck,
  FaCheckDouble,
  FaArrowLeft,
  FaPaperclip,
  FaTimes,
  FaFile,
  FaImage,
  FaBell,
} from 'react-icons/fa';

const ChatPage: FC = () => {
  const { user } = useUser();
  const { addAlert } = useUI();
  const { activeAccount } = useActiveWhatsappAccount();
  const accountId = activeAccount?.id || null;

  // Estado
  const [selectedPhone, setSelectedPhone] = useState<string | null>(null);
  const [messageInput, setMessageInput] = useState('');
  const [sending, setSending] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [newChatPhone, setNewChatPhone] = useState('');
  const [showNewChat, setShowNewChat] = useState(false);
  const [notifPermission, setNotifPermission] = useState<NotificationPermission>('default');

  // Estado para archivos
  const [attachedFile, setAttachedFile] = useState<File | null>(null);
  const [attachedPreview, setAttachedPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Firestore real-time
  const { conversations, loading: loadingConversations } = useConversations(
    user?.id || null,
    accountId,
  );
  const { messages, loading: loadingMessages } = useMessages(selectedPhone, accountId);

  // Scroll al final cuando llegan mensajes
  const messagesEndRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // ═══ Notificaciones del navegador ═══
  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      setNotifPermission(Notification.permission);
    }
  }, []);

  const requestNotifPermission = useCallback(async () => {
    if (typeof window === 'undefined' || !('Notification' in window)) return;
    const perm = await Notification.requestPermission();
    setNotifPermission(perm);
  }, []);

  // Notificar cuando llega mensaje inbound y la pestaña no tiene foco
  const prevMessagesCount = useRef(0);
  useEffect(() => {
    if (!messages.length) {
      prevMessagesCount.current = 0;
      return;
    }
    if (prevMessagesCount.current > 0 && messages.length > prevMessagesCount.current) {
      const lastMsg = messages[messages.length - 1];
      if (lastMsg.direction === 'inbound' && document.hidden && notifPermission === 'granted') {
        const convName = conversations.find(c => c.id === selectedPhone)?.customerName || selectedPhone || '';
        new Notification(`💬 ${convName}`, {
          body: lastMsg.content || '[Archivo]',
          icon: '/favicon-32.png',
          tag: `chat-${selectedPhone}`,
        });
      }
    }
    prevMessagesCount.current = messages.length;
  }, [messages, notifPermission, selectedPhone, conversations]);

  // Marcar como leído al seleccionar conversación
  useEffect(() => {
    if (selectedPhone) {
      markChatRead(selectedPhone).catch(() => {});
    }
  }, [selectedPhone]);

  // Enviar mensaje
  const handleSend = async () => {
    if ((!messageInput.trim() && !attachedFile) || !selectedPhone) return;
    setSending(true);
    try {
      if (attachedFile) {
        // Upload file primero
        setUploading(true);
        const formData = new FormData();
        formData.append('file', attachedFile);
        const uploadRes = await axios.post('/messages/upload', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        const mediaUrl = uploadRes.data.url;
        const fileType = getFileType(attachedFile.type);
        await sendChatMessage({
          phoneNumber: selectedPhone,
          content: messageInput.trim() || attachedFile.name,
          type: fileType,
          mediaUrl,
          mediaCaption: messageInput.trim() || attachedFile.name,
        });
        clearAttachment();
      } else {
        await sendChatMessage({
          phoneNumber: selectedPhone,
          content: messageInput.trim(),
          type: 'text',
        });
      }
      setMessageInput('');
    } catch (err: any) {
      addAlert({
        type: 'danger',
        message: err?.response?.data?.message || 'Error enviando mensaje',
      });
    } finally {
      setSending(false);
      setUploading(false);
    }
  };

  // Helpers de archivos
  const getFileType = (mimeType: string): 'image' | 'video' | 'audio' | 'document' => {
    if (mimeType.startsWith('image/')) return 'image';
    if (mimeType.startsWith('video/')) return 'video';
    if (mimeType.startsWith('audio/')) return 'audio';
    return 'document';
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      addAlert({ type: 'warning', message: 'El archivo no puede superar 10MB' });
      return;
    }
    setAttachedFile(file);
    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (ev) => setAttachedPreview(ev.target?.result as string);
      reader.readAsDataURL(file);
    } else {
      setAttachedPreview(null);
    }
  };

  const clearAttachment = () => {
    setAttachedFile(null);
    setAttachedPreview(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Nueva conversación
  const handleStartNewChat = () => {
    if (!newChatPhone.trim()) return;
    const phone = newChatPhone.replace(/[^\d]/g, '');
    if (phone.length < 10) {
      addAlert({ type: 'warning', message: 'Número inválido' });
      return;
    }
    setSelectedPhone(phone);
    setShowNewChat(false);
    setNewChatPhone('');
  };

  // Filtrar conversaciones
  const filteredConversations = conversations.filter((c) => {
    const term = searchTerm.toLowerCase();
    return (
      c.customerName?.toLowerCase().includes(term) ||
      c.phoneNumber?.includes(term) ||
      c.lastMessage?.toLowerCase().includes(term)
    );
  });

  // Status icon
  const StatusIcon = ({ status }: { status: string }) => {
    if (status === 'read') return <FaCheckDouble style={{ color: '#53bdeb', fontSize: '0.7rem' }} />;
    if (status === 'delivered') return <FaCheckDouble style={{ color: '#8696a0', fontSize: '0.7rem' }} />;
    if (status === 'sent') return <FaCheck style={{ color: '#8696a0', fontSize: '0.7rem' }} />;
    return null;
  };

  return (
    <>
      <SeoHead title="Chat" description="Chat en tiempo real con tus clientes por WhatsApp. Responde conversaciones, envía multimedia y gestiona tu bandeja desde Iris." pathname="/chat" noIndex />
      <style jsx>{`
        .chat-container {
          height: calc(100vh - 70px);
          display: flex;
          overflow: hidden;
          background: #efeae2;
        }
        .sidebar {
          width: 350px;
          min-width: 350px;
          background: #fff;
          border-right: 1px solid #e0e0e0;
          display: flex;
          flex-direction: column;
        }
        .sidebar-header {
          padding: 12px 16px;
          background: #f0f2f5;
          border-bottom: 1px solid #e0e0e0;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 8px;
        }
        .sidebar-header h5 {
          margin: 0;
          font-weight: 700;
          font-size: 1.1rem;
          color: #111b21;
        }
        .search-box {
          padding: 8px 12px;
          background: #f0f2f5;
        }
        .search-box input {
          border-radius: 20px;
          border: none;
          background: #fff;
          padding: 8px 16px;
          font-size: 0.85rem;
          width: 100%;
        }
        .conversation-list {
          flex: 1;
          overflow-y: auto;
        }
        .conversation-item {
          display: flex;
          align-items: center;
          padding: 12px 16px;
          cursor: pointer;
          border-bottom: 1px solid #f0f2f5;
          transition: background 0.15s;
        }
        .conversation-item:hover {
          background: #f5f6f6;
        }
        .conversation-item.active {
          background: #f0f2f5;
        }
        .conversation-avatar {
          width: 45px;
          height: 45px;
          border-radius: 50%;
          background: linear-gradient(135deg, #2c3e50, #34495e);
          color: #fff;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 600;
          font-size: 1.1rem;
          flex-shrink: 0;
          margin-right: 12px;
        }
        .conversation-info {
          flex: 1;
          min-width: 0;
        }
        .conversation-name {
          font-weight: 600;
          font-size: 0.9rem;
          color: #111b21;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .conversation-last-msg {
          font-size: 0.8rem;
          color: #667781;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          margin-top: 2px;
        }
        .conversation-meta {
          display: flex;
          flex-direction: column;
          align-items: flex-end;
          gap: 4px;
          flex-shrink: 0;
        }
        .conversation-time {
          font-size: 0.7rem;
          color: #667781;
        }
        .unread-badge {
          background: #25d366;
          color: #fff;
          border-radius: 50%;
          width: 20px;
          height: 20px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 0.7rem;
          font-weight: 700;
        }
        .chat-panel {
          flex: 1;
          display: flex;
          flex-direction: column;
          background: #efeae2;
        }
        .chat-header {
          padding: 10px 16px;
          background: #f0f2f5;
          border-bottom: 1px solid #e0e0e0;
          display: flex;
          align-items: center;
          gap: 12px;
        }
        .chat-header-avatar {
          width: 38px;
          height: 38px;
          border-radius: 50%;
          background: linear-gradient(135deg, #2c3e50, #34495e);
          color: #fff;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 600;
          font-size: 1rem;
        }
        .chat-header-name {
          font-weight: 600;
          font-size: 0.95rem;
          color: #111b21;
        }
        .chat-header-phone {
          font-size: 0.75rem;
          color: #667781;
        }
        .messages-area {
          flex: 1;
          overflow-y: auto;
          padding: 16px 60px;
          background: #efeae2 url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23d4cfc4' fill-opacity='0.15'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E");
        }
        .message-bubble {
          max-width: 65%;
          padding: 8px 12px;
          border-radius: 10px;
          margin-bottom: 4px;
          font-size: 0.88rem;
          line-height: 1.35;
          position: relative;
          word-wrap: break-word;
        }
        .message-bubble.outbound {
          background: #d9fdd3;
          margin-left: auto;
          border-bottom-right-radius: 2px;
        }
        .message-bubble.inbound {
          background: #fff;
          margin-right: auto;
          border-bottom-left-radius: 2px;
          box-shadow: 0 1px 0.5px rgba(11,20,26,0.13);
        }
        .message-time {
          font-size: 0.65rem;
          color: #667781;
          text-align: right;
          margin-top: 4px;
          display: flex;
          align-items: center;
          justify-content: flex-end;
          gap: 3px;
        }
        .input-area {
          padding: 10px 16px;
          background: #f0f2f5;
          display: flex;
          align-items: center;
          gap: 10px;
        }
        .input-area input {
          flex: 1;
          border-radius: 20px;
          border: none;
          padding: 10px 18px;
          font-size: 0.9rem;
          background: #fff;
          outline: none;
        }
        .send-btn {
          width: 42px;
          height: 42px;
          border-radius: 50%;
          background: #00a884;
          border: none;
          color: #fff;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: background 0.2s;
        }
        .send-btn:hover {
          background: #008f72;
        }
        .send-btn:disabled {
          background: #b0b0b0;
          cursor: not-allowed;
        }
        .attach-btn {
          width: 42px;
          height: 42px;
          border-radius: 50%;
          background: none;
          border: none;
          color: #54656f;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          font-size: 1.2rem;
          transition: color 0.2s;
        }
        .attach-btn:hover {
          color: #00a884;
        }
        .attach-preview {
          padding: 8px 16px;
          background: #e8f5e9;
          border-top: 1px solid #c8e6c9;
          display: flex;
          align-items: center;
          gap: 10px;
          font-size: 0.85rem;
        }
        .attach-preview img {
          width: 50px;
          height: 50px;
          object-fit: cover;
          border-radius: 6px;
        }
        .attach-preview .file-icon {
          width: 50px;
          height: 50px;
          border-radius: 6px;
          background: #fff;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 1.3rem;
          color: #54656f;
        }
        .attach-remove {
          background: none;
          border: none;
          color: #e74c3c;
          cursor: pointer;
          margin-left: auto;
          font-size: 1rem;
        }
        .notif-btn {
          background: none;
          border: none;
          color: #667781;
          cursor: pointer;
          font-size: 1rem;
          padding: 4px;
          border-radius: 50%;
          transition: color 0.2s;
        }
        .notif-btn.active {
          color: #25d366;
        }
        .notif-btn:hover {
          color: #00a884;
        }
        .message-media {
          max-width: 100%;
          border-radius: 8px;
          margin-bottom: 4px;
        }
        .message-media img {
          max-width: 100%;
          max-height: 300px;
          border-radius: 8px;
          cursor: pointer;
        }
        .message-media .doc-link {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 8px 12px;
          background: rgba(0,0,0,0.05);
          border-radius: 6px;
          text-decoration: none;
          color: #111b21;
          font-size: 0.85rem;
        }
        .message-media .doc-link:hover {
          background: rgba(0,0,0,0.1);
        }
        .empty-chat {
          flex: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          color: #667781;
          gap: 12px;
        }
        .empty-chat-icon {
          font-size: 4rem;
          color: #c4c4c4;
        }
        .new-chat-form {
          padding: 12px 16px;
          background: #fff;
          border-bottom: 1px solid #e0e0e0;
        }
        .back-btn {
          background: none;
          border: none;
          color: #667781;
          cursor: pointer;
          display: none;
        }
        @media (max-width: 768px) {
          .sidebar {
            width: 100%;
            min-width: 100%;
            display: ${selectedPhone ? 'none' : 'flex'};
          }
          .chat-panel {
            display: ${selectedPhone ? 'flex' : 'none'};
          }
          .back-btn {
            display: block;
          }
          .messages-area {
            padding: 12px 16px;
          }
        }
      `}</style>

      <div className="chat-container">
        {/* ═══ Sidebar ═══ */}
        <div className="sidebar">
          <div className="sidebar-header">
            <h5>
              <FaCommentDots style={{ marginRight: 8 }} />
              Chat
            </h5>
            <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
              <button
                className={`notif-btn ${notifPermission === 'granted' ? 'active' : ''}`}
                onClick={requestNotifPermission}
                title={notifPermission === 'granted' ? 'Notificaciones activas' : 'Activar notificaciones'}
              >
                <FaBell />
              </button>
              <Button
              size="sm"
              variant={showNewChat ? 'outline-secondary' : 'outline-success'}
              style={{ borderRadius: 20, fontSize: '0.8rem' }}
              onClick={() => setShowNewChat(!showNewChat)}
            >
              {showNewChat ? 'Cancelar' : '+ Nuevo'}
              </Button>
            </div>
          </div>

          {showNewChat && (
            <div className="new-chat-form">
              <Form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleStartNewChat();
                }}
              >
                <Form.Group className="d-flex gap-2">
                  <Form.Control
                    size="sm"
                    placeholder="Ej: 573001234567"
                    value={newChatPhone}
                    onChange={(e) => setNewChatPhone(e.target.value)}
                    style={{ borderRadius: 20, fontSize: '0.85rem' }}
                  />
                  <Button
                    size="sm"
                    variant="success"
                    type="submit"
                    style={{ borderRadius: 20 }}
                  >
                    Ir
                  </Button>
                </Form.Group>
              </Form>
            </div>
          )}

          <div className="search-box">
            <input
              placeholder="Buscar conversación..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="conversation-list">
            {loadingConversations ? (
              <div className="text-center py-4">
                <Spinner animation="border" size="sm" />
              </div>
            ) : filteredConversations.length === 0 ? (
              <div className="text-center py-4 text-muted" style={{ fontSize: '0.85rem' }}>
                No hay conversaciones
              </div>
            ) : (
              filteredConversations.map((c) => (
                <div
                  key={c.id}
                  className={`conversation-item ${selectedPhone === c.id ? 'active' : ''}`}
                  onClick={() => setSelectedPhone(c.id)}
                >
                  <div className="conversation-avatar">
                    {(c.customerName || c.phoneNumber || '?')[0]?.toUpperCase()}
                  </div>
                  <div className="conversation-info">
                    <div className="conversation-name">
                      {c.customerName || c.phoneNumber}
                    </div>
                    <div className="conversation-last-msg">
                      {c.lastMessage || 'Sin mensajes'}
                    </div>
                  </div>
                  <div className="conversation-meta">
                    <span className="conversation-time">
                      {formatTimestamp(c.lastMessageAt)}
                    </span>
                    {c.unreadCount > 0 && (
                      <span className="unread-badge">{c.unreadCount}</span>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* ═══ Chat Panel ═══ */}
        <div className="chat-panel">
          {selectedPhone ? (
            <>
              {/* Header */}
              <div className="chat-header">
                <button
                  className="back-btn"
                  onClick={() => setSelectedPhone(null)}
                >
                  <FaArrowLeft />
                </button>
                <div className="chat-header-avatar">
                  <FaUser />
                </div>
                <div>
                  <div className="chat-header-name">
                    {conversations.find((c) => c.id === selectedPhone)
                      ?.customerName || selectedPhone}
                  </div>
                  <div className="chat-header-phone">+{selectedPhone}</div>
                </div>
              </div>

              {/* Messages */}
              <div className="messages-area">
                {loadingMessages ? (
                  <div className="text-center py-4">
                    <Spinner animation="border" size="sm" />
                  </div>
                ) : messages.length === 0 ? (
                  <div className="text-center py-5 text-muted">
                    <FaCommentDots style={{ fontSize: '2rem', marginBottom: 8 }} />
                    <div style={{ fontSize: '0.85rem' }}>
                      No hay mensajes aún. Envía el primero.
                    </div>
                  </div>
                ) : (
                  messages.map((msg) => (
                    <div
                      key={msg.id}
                      className={`message-bubble ${msg.direction}`}
                    >
                      {msg.mediaUrl && (
                        <div className="message-media">
                          {(msg.type === 'image') ? (
                            <img
                              src={msg.mediaUrl}
                              alt={msg.mediaCaption || 'imagen'}
                              onClick={() => window.open(msg.mediaUrl, '_blank')}
                            />
                          ) : (
                            <a className="doc-link" href={msg.mediaUrl} target="_blank" rel="noreferrer">
                              <FaFile />
                              {msg.mediaCaption || msg.content || 'Archivo'}
                            </a>
                          )}
                        </div>
                      )}
                      {(!msg.mediaUrl || msg.content) && <div>{msg.content}</div>}
                      <div className="message-time">
                        {formatTimestamp(msg.timestamp)}
                        {msg.direction === 'outbound' && (
                          <StatusIcon status={msg.status} />
                        )}
                      </div>
                    </div>
                  ))
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Preview archivo adjunto */}
              {attachedFile && (
                <div className="attach-preview">
                  {attachedPreview ? (
                    <img src={attachedPreview} alt="preview" />
                  ) : (
                    <div className="file-icon"><FaFile /></div>
                  )}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {attachedFile.name}
                    </div>
                    <div style={{ color: '#667781', fontSize: '0.75rem' }}>
                      {(attachedFile.size / 1024).toFixed(0)} KB
                    </div>
                  </div>
                  <button className="attach-remove" onClick={clearAttachment}><FaTimes /></button>
                </div>
              )}

              {/* Input */}
              <div className="input-area">
                <input
                  type="file"
                  ref={fileInputRef}
                  style={{ display: 'none' }}
                  onChange={handleFileSelect}
                  accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.xls,.xlsx,.csv,.txt,.zip"
                />
                <button
                  className="attach-btn"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={sending}
                  title="Adjuntar archivo"
                >
                  <FaPaperclip />
                </button>
                <input
                  placeholder="Escribe un mensaje..."
                  value={messageInput}
                  onChange={(e) => setMessageInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSend();
                    }
                  }}
                  disabled={sending}
                />
                <button
                  className="send-btn"
                  onClick={handleSend}
                  disabled={(!messageInput.trim() && !attachedFile) || sending}
                >
                  {sending ? (
                    <Spinner animation="border" size="sm" />
                  ) : (
                    <FaPaperPlane />
                  )}
                </button>
              </div>
            </>
          ) : (
            <div className="empty-chat">
              <FaCommentDots className="empty-chat-icon" />
              <h5 style={{ color: '#41525d', fontWeight: 500 }}>Iris Chat</h5>
              <p style={{ fontSize: '0.85rem', maxWidth: 400, textAlign: 'center' }}>
                Selecciona una conversación o inicia una nueva para comunicarte con tus clientes por WhatsApp en tiempo real.
              </p>
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export async function getStaticProps() {
  return { props: {}, revalidate: 1 };
}

export default withAuthSync(ChatPage);

'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import Link from 'next/link';
import TopNav from '@/components/TopNav';
import { useAuth } from '@/app/auth-context';

export default function MessagesPage() {
  const router = useRouter();
  const { hydrated } = useAuth();
  const [rooms, setRooms] = useState([]);
  const [selectedRoom, setSelectedRoom] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [messageLoading, setMessageLoading] = useState(false);
  const [error, setError] = useState('');
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    if (!hydrated) return;
    fetchRooms();
  }, [hydrated]);

  useEffect(() => {
    if (selectedRoom) {
      fetchMessages();
      const interval = setInterval(() => {
        fetchMessages();
      }, 3000); // 3초마다 새로운 메시지 확인
      return () => clearInterval(interval);
    }
  }, [selectedRoom]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const fetchRooms = async () => {
    try {
      setLoading(true);
      setError('');

      const token = localStorage.getItem('accessToken');
      if (!token) {
        router.push('/login');
        return;
      }

      const response = await axios.get(
        `/api/chat-rooms?limit=50`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      const directRooms = (response.data.data || []).filter(room => room.type === 'direct');
      setRooms(directRooms);
      if (directRooms.length > 0) {
        setSelectedRoom(directRooms[0]);
      }
    } catch (err) {
      const errorMsg = err.response?.data?.error || '채팅방 조회에 실패했습니다';
      setError(errorMsg);
      console.error('에러:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchMessages = async () => {
    if (!selectedRoom) return;

    try {
      setMessageLoading(true);
      const token = localStorage.getItem('accessToken');

      const response = await axios.get(
        `/api/messages?roomId=${selectedRoom.id}&limit=50`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setMessages(response.data.data || []);
    } catch (err) {
      console.error('메시지 조회 에러:', err);
    } finally {
      setMessageLoading(false);
    }
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedRoom) return;

    try {
      setSending(true);
      const token = localStorage.getItem('accessToken');

      const response = await axios.post(
        `/api/messages`,
        { roomId: selectedRoom.id, content: newMessage },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setMessages([...messages, response.data.data]);
      setNewMessage('');
    } catch (err) {
      setError(err.response?.data?.error || '메시지 전송에 실패했습니다');
    } finally {
      setSending(false);
    }
  };

  const handleDeleteMessage = async (messageId) => {
    if (!confirm('메시지를 삭제하시겠습니까?')) return;

    try {
      const token = localStorage.getItem('accessToken');
      await axios.delete(
        `/api/messages/${messageId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setMessages(messages.filter(m => m.id !== messageId));
    } catch (err) {
      setError(err.response?.data?.error || '메시지 삭제에 실패했습니다');
    }
  };

  if (loading && rooms.length === 0) {
    return (
      <>
        <TopNav />
        <div style={styles.container}>
          <div style={styles.loadingSpinner}>로딩 중...</div>
        </div>
      </>
    );
  }

  return (
    <>
      <TopNav />
      <div style={styles.container}>
        <div style={styles.pageHeader}>
          <Link href="/dashboard" style={styles.backLink}>
            ← 뒤로 가기
          </Link>
          <h1 style={styles.title}>💬 메시지</h1>
          <p style={styles.subtitle}>1:1로 대화하세요</p>
        </div>

        {error && (
          <div style={styles.errorCard}>
            <p>⚠️ {error}</p>
          </div>
        )}

        <div style={styles.messagesContainer}>
          {/* 채팅방 목록 */}
          <div style={styles.roomsList}>
            <h2 style={styles.roomsTitle}>채팅방</h2>
            {rooms.length > 0 ? (
              <div style={styles.roomsScroll}>
                {rooms.map((room) => {
                  const otherMember = room.members?.find(m => m.user);
                  return (
                    <div
                      key={room.id}
                      onClick={() => setSelectedRoom(room)}
                      style={{
                        ...styles.roomItem,
                        background: selectedRoom?.id === room.id ? '#667eea' : 'white',
                        color: selectedRoom?.id === room.id ? 'white' : '#333',
                      }}
                    >
                      <div style={styles.roomItemImage}>
                        {otherMember?.user?.profileImage ? (
                          <img
                            src={otherMember.user.profileImage}
                            alt={otherMember.user.username}
                            style={styles.profileImage}
                          />
                        ) : (
                          <div style={styles.defaultImage}>
                            {otherMember?.user?.username?.charAt(0) || '?'}
                          </div>
                        )}
                      </div>
                      <p style={styles.roomItemName}>
                        {otherMember?.user?.username || 'Unknown'}
                      </p>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p style={styles.emptyRooms}>채팅방이 없습니다</p>
            )}
          </div>

          {/* 메시지 영역 */}
          {selectedRoom ? (
            <div style={styles.messagesArea}>
              <div style={styles.messagesHeader}>
                <h3 style={styles.chatTitle}>
                  {selectedRoom.members
                    ?.filter(m => m.user)
                    .map(m => m.user.username)
                    .join(', ') || '채팅'}
                </h3>
              </div>

              <div style={styles.messagesList}>
                {messages.length > 0 ? (
                  <>
                    {messages.map((msg, idx) => (
                      <div
                        key={idx}
                        style={{
                          ...styles.messageItem,
                          justifyContent:
                            msg.senderId === localStorage.getItem('userId')
                              ? 'flex-end'
                              : 'flex-start',
                        }}
                      >
                        <div
                          style={{
                            ...styles.messageBubble,
                            background:
                              msg.senderId === localStorage.getItem('userId')
                                ? '#667eea'
                                : '#f0f0f0',
                            color:
                              msg.senderId === localStorage.getItem('userId')
                                ? 'white'
                                : '#333',
                          }}
                          onMouseEnter={(e) => {
                            if (msg.senderId === localStorage.getItem('userId')) {
                              e.currentTarget.style.opacity = '0.9';
                            }
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.opacity = '1';
                          }}
                        >
                          {msg.imageUrl && (
                            <img
                              src={msg.imageUrl}
                              alt="message"
                              style={styles.messageImage}
                            />
                          )}
                          <p style={styles.messageContent}>{msg.content}</p>
                          <p style={styles.messageTime}>
                            {new Date(msg.createdAt).toLocaleTimeString('ko-KR')}
                          </p>
                          {msg.senderId === localStorage.getItem('userId') && (
                            <button
                              onClick={() => handleDeleteMessage(msg.id)}
                              style={styles.deleteBtn}
                              title="삭제"
                            >
                              ✕
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                    <div ref={messagesEndRef} />
                  </>
                ) : (
                  <div style={styles.noMessages}>
                    <p>아직 메시지가 없습니다</p>
                  </div>
                )}
              </div>

              {/* 메시지 입력 */}
              <form onSubmit={handleSendMessage} style={styles.messageForm}>
                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="메시지를 입력하세요..."
                  style={styles.messageInput}
                  disabled={sending}
                />
                <button
                  type="submit"
                  disabled={sending || !newMessage.trim()}
                  style={styles.sendButton}
                >
                  {sending ? '전송중...' : '전송'}
                </button>
              </form>
            </div>
          ) : (
            <div style={styles.noRoomSelected}>
              <p>채팅방을 선택하세요</p>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

const styles = {
  container: {
    height: 'calc(100vh - 100px)',
    paddingTop: '100px',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
  },
  pageHeader: {
    padding: '0 20px 20px 20px',
    maxWidth: '1400px',
    margin: '0 auto',
  },
  backLink: {
    color: 'rgba(255,255,255,0.8)',
    textDecoration: 'none',
    fontSize: '14px',
    fontWeight: '600',
    display: 'inline-block',
    marginBottom: '15px',
  },
  title: {
    fontSize: '32px',
    fontWeight: 'bold',
    color: 'white',
    textShadow: '2px 2px 4px rgba(0,0,0,0.3)',
    margin: '0 0 5px 0',
  },
  subtitle: {
    fontSize: '14px',
    color: 'rgba(255,255,255,0.7)',
    margin: '0',
  },
  errorCard: {
    margin: '0 20px 20px 20px',
    maxWidth: '1400px',
    marginLeft: 'auto',
    marginRight: 'auto',
    background: 'rgba(220, 53, 69, 0.9)',
    color: 'white',
    padding: '15px 20px',
    borderRadius: '12px',
  },
  messagesContainer: {
    display: 'flex',
    gap: '0',
    height: 'calc(100% - 150px)',
    maxWidth: '1400px',
    margin: '0 auto',
    padding: '0 20px 20px 20px',
  },
  roomsList: {
    width: '280px',
    background: 'white',
    borderRadius: '12px 0 0 12px',
    borderRight: '1px solid #eee',
    padding: '20px',
    overflowY: 'auto',
    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
  },
  roomsTitle: {
    fontSize: '16px',
    fontWeight: '700',
    color: '#333',
    margin: '0 0 15px 0',
  },
  roomsScroll: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  roomItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '12px',
    borderRadius: '8px',
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  roomItemImage: {
    width: '40px',
    height: '40px',
    borderRadius: '50%',
    overflow: 'hidden',
    background: '#eee',
  },
  profileImage: {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
  },
  defaultImage: {
    width: '100%',
    height: '100%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '18px',
    fontWeight: 'bold',
    color: '#999',
  },
  roomItemName: {
    margin: '0',
    fontSize: '14px',
    fontWeight: '600',
    flex: 1,
  },
  emptyRooms: {
    color: '#999',
    fontSize: '14px',
    textAlign: 'center',
    padding: '20px',
  },
  messagesArea: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    background: 'white',
    borderRadius: '0 12px 12px 0',
    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
  },
  messagesHeader: {
    padding: '15px 20px',
    borderBottom: '1px solid #eee',
    background: '#f9f9f9',
  },
  chatTitle: {
    margin: '0',
    fontSize: '16px',
    fontWeight: '700',
    color: '#333',
  },
  messagesList: {
    flex: 1,
    overflowY: 'auto',
    padding: '20px',
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  messageItem: {
    display: 'flex',
    gap: '8px',
  },
  messageBubble: {
    maxWidth: '60%',
    padding: '12px 16px',
    borderRadius: '12px',
    wordWrap: 'break-word',
    position: 'relative',
  },
  messageContent: {
    margin: '0 0 4px 0',
    fontSize: '14px',
  },
  messageImage: {
    maxWidth: '200px',
    borderRadius: '8px',
    marginBottom: '8px',
  },
  messageTime: {
    margin: '0',
    fontSize: '11px',
    opacity: 0.7,
  },
  deleteBtn: {
    position: 'absolute',
    top: '-8px',
    right: '-8px',
    background: '#dc3545',
    color: 'white',
    border: 'none',
    borderRadius: '50%',
    width: '20px',
    height: '20px',
    cursor: 'pointer',
    fontSize: '12px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  noMessages: {
    textAlign: 'center',
    color: '#999',
    padding: '40px 20px',
  },
  messageForm: {
    display: 'flex',
    gap: '10px',
    padding: '15px 20px',
    borderTop: '1px solid #eee',
  },
  messageInput: {
    flex: 1,
    padding: '10px 15px',
    border: '1px solid #ddd',
    borderRadius: '6px',
    fontSize: '14px',
    outline: 'none',
  },
  sendButton: {
    padding: '10px 20px',
    background: '#667eea',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
  },
  noRoomSelected: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'white',
    borderRadius: '0 12px 12px 0',
    color: '#999',
    fontSize: '16px',
  },
  loadingSpinner: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    height: 'calc(100vh - 100px)',
    fontSize: '20px',
    color: 'white',
  },
};

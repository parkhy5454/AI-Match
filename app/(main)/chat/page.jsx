'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import Link from 'next/link';
import TopNav from '@/components/TopNav';
import { useAuth } from '@/app/auth-context';

export default function ChatPage() {
  const router = useRouter();
  const { hydrated } = useAuth();
  const [rooms, setRooms] = useState([]);
  const [selectedRoom, setSelectedRoom] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [messageInput, setMessageInput] = useState('');
  const [sending, setSending] = useState(false);
  const [showCreateRoom, setShowCreateRoom] = useState(false);
  const [roomName, setRoomName] = useState('');
  const messagesEndRef = useRef(null);

  useEffect(() => {
    if (!hydrated) return;
    fetchChatRooms();
    const interval = setInterval(fetchChatRooms, 3000);
    return () => clearInterval(interval);
  }, [hydrated]);

  useEffect(() => {
    if (selectedRoom) {
      fetchMessages();
      const interval = setInterval(fetchMessages, 3000);
      return () => clearInterval(interval);
    }
  }, [selectedRoom]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const fetchChatRooms = async () => {
    try {
      const token = localStorage.getItem('accessToken');
      if (!token) {
        router.push('/login');
        return;
      }

      const response = await axios.get(
        `/api/chat-rooms`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setRooms(response.data.data || []);
      if (response.data.data && response.data.data.length > 0 && !selectedRoom) {
        setSelectedRoom(response.data.data[0].id);
      }
    } catch (err) {
      console.error('채팅방 조회 실패:', err);
    }
  };

  const fetchMessages = async () => {
    if (!selectedRoom) return;

    try {
      const token = localStorage.getItem('accessToken');
      const response = await axios.get(
        `/api/chat?roomId=${selectedRoom}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setMessages(response.data.data || []);
      setError('');
    } catch (err) {
      console.error('메시지 조회 실패:', err);
    }
  };

  const handleCreateRoom = async (e) => {
    e.preventDefault();
    if (!roomName.trim()) return;

    try {
      setSending(true);
      const token = localStorage.getItem('accessToken');

      const response = await axios.post(
        `/api/chat-rooms`,
        { name: roomName },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setRooms([...rooms, response.data.data]);
      setRoomName('');
      setShowCreateRoom(false);
      setSelectedRoom(response.data.data.id);
    } catch (err) {
      const errorMsg = err.response?.data?.error || '채팅방 생성에 실패했습니다';
      setError(errorMsg);
    } finally {
      setSending(false);
    }
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!messageInput.trim() || !selectedRoom) return;

    const message = messageInput;
    setMessageInput('');

    try {
      setSending(true);
      const token = localStorage.getItem('accessToken');

      const response = await axios.post(
        `/api/chat`,
        { roomId: selectedRoom, message },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setMessages([...messages, response.data.data]);
      setError('');
    } catch (err) {
      const errorMsg = err.response?.data?.error || '메시지 전송에 실패했습니다';
      setError(errorMsg);
      setMessageInput(message);
    } finally {
      setSending(false);
    }
  };

  if (loading && rooms.length === 0 && !hydrated) {
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
      <div style={styles.chatContainer}>
        {/* 사이드바 - 채팅방 목록 */}
        <div style={styles.sidebar}>
          <div style={styles.sidebarHeader}>
            <Link href="/dashboard" style={styles.backLink}>
              ← 돌아가기
            </Link>
            <button
              onClick={() => setShowCreateRoom(!showCreateRoom)}
              style={styles.createRoomButton}
            >
              + 새 채팅방
            </button>
          </div>

          {showCreateRoom && (
            <form onSubmit={handleCreateRoom} style={styles.createRoomForm}>
              <input
                type="text"
                placeholder="채팅방 이름"
                value={roomName}
                onChange={(e) => setRoomName(e.target.value)}
                style={styles.roomInput}
                disabled={sending}
              />
              <div style={styles.formButtons}>
                <button
                  type="submit"
                  disabled={sending}
                  style={styles.submitButton}
                >
                  {sending ? '생성 중...' : '생성'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowCreateRoom(false)}
                  style={styles.cancelButton}
                >
                  취소
                </button>
              </div>
            </form>
          )}

          <div style={styles.roomsList}>
            {rooms.length > 0 ? (
              rooms.map((room) => (
                <div
                  key={room.id}
                  onClick={() => setSelectedRoom(room.id)}
                  style={{
                    ...styles.roomItem,
                    background: selectedRoom === room.id ? '#667eea' : '#f9f9f9',
                    color: selectedRoom === room.id ? 'white' : '#333',
                  }}
                >
                  <h4 style={styles.roomName}>{room.name}</h4>
                  <p style={styles.roomInfo}>
                    {room.memberCount} 명
                  </p>
                </div>
              ))
            ) : (
              <p style={styles.noRooms}>채팅방이 없습니다</p>
            )}
          </div>
        </div>

        {/* 메인 영역 - 채팅 */}
        <div style={styles.chatArea}>
          {selectedRoom ? (
            <>
              {/* 채팅방 헤더 */}
              <div style={styles.chatHeader}>
                <h2 style={styles.chatTitle}>
                  {rooms.find(r => r.id === selectedRoom)?.name || '채팅방'}
                </h2>
                <p style={styles.memberCount}>
                  {rooms.find(r => r.id === selectedRoom)?.memberCount || 0}명 참여 중
                </p>
              </div>

              {error && (
                <div style={styles.errorCard}>
                  <p>⚠️ {error}</p>
                </div>
              )}

              {/* 메시지 영역 */}
              <div style={styles.messagesContainer}>
                {messages.length > 0 ? (
                  <>
                    {messages.map((msg) => (
                      <div
                        key={msg.id}
                        style={{
                          ...styles.messageWrapper,
                          justifyContent: msg.isMine ? 'flex-end' : 'flex-start',
                        }}
                      >
                        <div
                          style={{
                            ...styles.messageBubble,
                            background: msg.isMine ? '#667eea' : '#f0f0f0',
                            color: msg.isMine ? 'white' : '#333',
                          }}
                        >
                          {!msg.isMine && (
                            <p style={styles.senderName}>{msg.sender?.username}</p>
                          )}
                          <p style={styles.messageText}>{msg.content}</p>
                          <p style={styles.messageTime}>
                            {new Date(msg.createdAt).toLocaleTimeString('ko-KR')}
                          </p>
                        </div>
                      </div>
                    ))}
                    <div ref={messagesEndRef} />
                  </>
                ) : (
                  <div style={styles.emptyMessages}>
                    <p style={styles.emptyIcon}>💬</p>
                    <p style={styles.emptyText}>아직 메시지가 없습니다</p>
                  </div>
                )}
              </div>

              {/* 입력 영역 */}
              <form onSubmit={handleSendMessage} style={styles.inputForm}>
                <input
                  type="text"
                  value={messageInput}
                  onChange={(e) => setMessageInput(e.target.value)}
                  placeholder="메시지를 입력하세요..."
                  disabled={sending}
                  style={styles.messageInput}
                />
                <button
                  type="submit"
                  disabled={sending || !messageInput.trim()}
                  style={{
                    ...styles.sendButton,
                    opacity: sending || !messageInput.trim() ? 0.5 : 1,
                  }}
                >
                  {sending ? '전송 중...' : '전송'}
                </button>
              </form>
            </>
          ) : (
            <div style={styles.noRoomSelected}>
              <p style={styles.noRoomIcon}>👥</p>
              <p style={styles.noRoomText}>채팅방을 선택하세요</p>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

const styles = {
  chatContainer: {
    display: 'flex',
    height: 'calc(100vh - 60px)',
    background: '#f5f5f5',
    paddingTop: '60px',
  },
  sidebar: {
    width: '280px',
    background: 'white',
    borderRight: '1px solid #ddd',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
  },
  sidebarHeader: {
    padding: '15px',
    borderBottom: '1px solid #ddd',
  },
  backLink: {
    color: '#667eea',
    textDecoration: 'none',
    fontSize: '13px',
    fontWeight: '600',
    display: 'block',
    marginBottom: '10px',
  },
  createRoomButton: {
    width: '100%',
    padding: '8px',
    background: '#667eea',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    fontSize: '13px',
    fontWeight: '600',
    cursor: 'pointer',
  },
  createRoomForm: {
    padding: '15px',
    borderBottom: '1px solid #eee',
  },
  roomInput: {
    width: '100%',
    padding: '8px',
    border: '1px solid #ddd',
    borderRadius: '6px',
    fontSize: '13px',
    marginBottom: '10px',
    boxSizing: 'border-box',
  },
  formButtons: {
    display: 'flex',
    gap: '8px',
  },
  submitButton: {
    flex: 1,
    padding: '6px',
    background: '#667eea',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    fontSize: '12px',
    fontWeight: '600',
    cursor: 'pointer',
  },
  cancelButton: {
    flex: 1,
    padding: '6px',
    background: '#ddd',
    color: '#333',
    border: 'none',
    borderRadius: '4px',
    fontSize: '12px',
    fontWeight: '600',
    cursor: 'pointer',
  },
  roomsList: {
    flex: 1,
    overflowY: 'auto',
    padding: '10px',
  },
  roomItem: {
    padding: '12px',
    borderRadius: '8px',
    marginBottom: '8px',
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  roomName: {
    fontSize: '14px',
    fontWeight: '600',
    margin: '0 0 4px 0',
  },
  roomInfo: {
    fontSize: '12px',
    opacity: 0.6,
    margin: '0',
  },
  noRooms: {
    fontSize: '13px',
    color: '#999',
    textAlign: 'center',
    padding: '20px',
  },
  chatArea: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    background: 'white',
  },
  chatHeader: {
    padding: '15px 20px',
    borderBottom: '1px solid #ddd',
  },
  chatTitle: {
    fontSize: '18px',
    fontWeight: '700',
    color: '#333',
    margin: '0 0 5px 0',
  },
  memberCount: {
    fontSize: '13px',
    color: '#999',
    margin: '0',
  },
  errorCard: {
    background: 'rgba(220, 53, 69, 0.1)',
    color: '#dc3545',
    padding: '10px 15px',
    margin: '10px 15px',
    borderRadius: '6px',
    fontSize: '13px',
  },
  messagesContainer: {
    flex: 1,
    overflowY: 'auto',
    padding: '15px 20px',
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
  },
  messageWrapper: {
    display: 'flex',
  },
  messageBubble: {
    maxWidth: '60%',
    padding: '12px 15px',
    borderRadius: '12px',
  },
  senderName: {
    fontSize: '11px',
    fontWeight: '600',
    margin: '0 0 4px 0',
    opacity: 0.7,
  },
  messageText: {
    fontSize: '14px',
    margin: '0 0 4px 0',
    wordBreak: 'break-word',
  },
  messageTime: {
    fontSize: '11px',
    opacity: 0.6,
    margin: '0',
  },
  emptyMessages: {
    textAlign: 'center',
    padding: '40px 20px',
    color: '#999',
  },
  emptyIcon: {
    fontSize: '36px',
    display: 'block',
    margin: '0 0 10px 0',
  },
  emptyText: {
    fontSize: '14px',
    margin: '0',
  },
  inputForm: {
    display: 'flex',
    gap: '10px',
    padding: '15px 20px',
    borderTop: '1px solid #ddd',
    background: '#f9f9f9',
  },
  messageInput: {
    flex: 1,
    padding: '10px',
    border: '1px solid #ddd',
    borderRadius: '6px',
    fontSize: '14px',
    boxSizing: 'border-box',
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
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    height: '100%',
    color: '#999',
  },
  noRoomIcon: {
    fontSize: '48px',
    margin: '0 0 15px 0',
  },
  noRoomText: {
    fontSize: '16px',
    margin: '0',
  },
  loadingSpinner: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: '100vh',
    fontSize: '20px',
    color: '#667eea',
  },
};

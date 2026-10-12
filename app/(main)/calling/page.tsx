
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import CallButton from '@/app/components/CallButton';
import VideoCallModal from '@/app/components/VideoCallModal';
import { useVideoCall } from '@/app/hooks/useVideoCall';
import { useCallNotifications } from '@/app/hooks/useCallNotifications';
import styles from './page.module.css';

interface ContactUser {
  id: string;
  username: string;
  image?: string;
  isOnline: boolean;
  lastSeen?: Date;
}

export default function CallingPage() {
  const router = useRouter();
  const { callState, startCall, acceptCall, rejectCall, endCall } = useVideoCall();
  const { incomingCall } = useCallNotifications();
  const [contacts, setContacts] = useState<ContactUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [showIncomingModal, setShowIncomingModal] = useState(false);

  useEffect(() => {
    fetchContacts();
  }, []);

  useEffect(() => {
    if (incomingCall) {
      setShowIncomingModal(true);
    }
  }, [incomingCall]);

  const fetchContacts = async () => {
    try {
      const response = await fetch('/api/calling/contacts');
      const data = await response.json();
      setContacts(data);
    } catch (error) {
      console.error('Failed to fetch contacts:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAcceptCall = async () => {
    if (incomingCall) {
      await acceptCall(incomingCall.callId);
      setShowIncomingModal(false);
    }
  };

  const handleRejectCall = async () => {
    if (incomingCall) {
      await rejectCall(incomingCall.callId);
      setShowIncomingModal(false);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1>영상 & 음성 통화</h1>
        <p>매칭된 사용자와 통화합니다.</p>
      </div>

      <div className={styles.content}>
        <div className={styles.contactsList}>
          <h2>연락처</h2>
          {loading ? (
            <p className={styles.loading}>로딩 중...</p>
          ) : contacts.length === 0 ? (
            <p className={styles.empty}>통화할 연락처가 없습니다.</p>
          ) : (
            <div className={styles.grid}>
              {contacts.map((contact) => (
                <div key={contact.id} className={styles.contactCard}>
                  {contact.image && (
                    <img src={contact.image} alt={contact.username} />
                  )}
                  <div className={styles.info}>
                    <h3>{contact.username}</h3>
                    <p className={`${styles.status} ${contact.isOnline ? styles.online : ''}`}>
                      {contact.isOnline ? '온라인' : '오프라인'}
                    </p>
                  </div>
                  <CallButton
                    recipientId={contact.id}
                    recipientName={contact.username}
                    recipientImage={contact.image}
                    onCallStart={() => startCall(contact.id, contact.username)}
                  />
                </div>
              ))}
            </div>
          )}
        </div>

        <div className={styles.sidePanel}>
          <h2>통화 기록</h2>
          <div className={styles.empty}>통화 기록이 없습니다.</div>
        </div>
      </div>

      {/* Active call modal */}
      {callState && (
        <VideoCallModal
          isOpen={true}
          recipientId={callState.recipientId}
          recipientName={callState.recipientName}
          isCaller={true}
          onClose={endCall}
        />
      )}

      {/* Incoming call modal */}
      {incomingCall && (
        <VideoCallModal
          isOpen={showIncomingModal}
          recipientId={incomingCall.callerId}
          recipientName={incomingCall.callerName}
          recipientImage={incomingCall.callerImage}
          isIncoming={true}
          onAccept={handleAcceptCall}
          onReject={handleRejectCall}
          onClose={() => setShowIncomingModal(false)}
        />
      )}
    </div>
  );
}

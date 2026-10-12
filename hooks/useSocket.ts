/**
 * useSocket Custom Hook
 * Socket.io 기능을 쉽게 사용하기 위한 Hook
 */

import { useCallback } from 'react'
import { useSocketContext } from '@/app/socket-context'

interface UseSocketReturn {
  connected: boolean
  messages: any[]
  onlineUsers: Set<string>
  typingUsers: Set<string>
  sendMessage: (recipientId: string, content: string) => void
  markAsRead: (messageIds: string[]) => void
  joinRoom: (recipientId: string) => void
  leaveRoom: (recipientId: string) => void
  startTyping: (recipientId: string) => void
  stopTyping: (recipientId: string) => void
  checkStatus: (userIds: string[]) => void
  updatePresence: (status: 'online' | 'away' | 'busy' | 'offline') => void
}

/**
 * Socket.io 훅
 */
export function useSocket(): UseSocketReturn {
  const { socket, connected, messages, onlineUsers, typingUsers } =
    useSocketContext()

  const sendMessage = useCallback(
    (recipientId: string, content: string) => {
      if (!socket) return
      socket.emit('message:send', { recipientId, content })
    },
    [socket]
  )

  const markAsRead = useCallback(
    (messageIds: string[]) => {
      if (!socket) return
      socket.emit('message:read', { messageIds })
    },
    [socket]
  )

  const joinRoom = useCallback(
    (recipientId: string) => {
      if (!socket) return
      socket.emit('room:join', { recipientId })
    },
    [socket]
  )

  const leaveRoom = useCallback(
    (recipientId: string) => {
      if (!socket) return
      socket.emit('room:leave', { recipientId })
    },
    [socket]
  )

  const startTyping = useCallback(
    (recipientId: string) => {
      if (!socket) return
      socket.emit('message:typing', { recipientId })
    },
    [socket]
  )

  const stopTyping = useCallback(
    (recipientId: string) => {
      if (!socket) return
      socket.emit('message:stopped-typing', { recipientId })
    },
    [socket]
  )

  const checkStatus = useCallback(
    (userIds: string[]) => {
      if (!socket) return
      socket.emit('status:check', { userIds })
    },
    [socket]
  )

  const updatePresence = useCallback(
    (status: 'online' | 'away' | 'busy' | 'offline') => {
      if (!socket) return
      socket.emit('presence:update', { status })
    },
    [socket]
  )

  return {
    connected,
    messages,
    onlineUsers,
    typingUsers,
    sendMessage,
    markAsRead,
    joinRoom,
    leaveRoom,
    startTyping,
    stopTyping,
    checkStatus,
    updatePresence,
  }
}

/**
 * Socket.io React Context
 * WebSocket 클라이언트 관리
 */

'use client'

import React, { createContext, useEffect, useState, ReactNode } from 'react'
import { io, Socket } from 'socket.io-client'

interface Message {
  id: string
  senderId: string
  senderName?: string
  recipientId: string
  content: string
  isRead: boolean
  createdAt: Date | string
}

interface SocketContextType {
  socket: Socket | null
  connected: boolean
  messages: Message[]
  onlineUsers: Set<string>
  typingUsers: Set<string>
}

const SocketContext = createContext<SocketContextType | undefined>(undefined)

/**
 * Socket Context Provider
 */
export function SocketProvider({
  children,
  token,
}: {
  children: ReactNode
  token: string
}) {
  const [socket, setSocket] = useState<Socket | null>(null)
  const [connected, setConnected] = useState(false)
  const [messages, setMessages] = useState<Message[]>([])
  const [onlineUsers, setOnlineUsers] = useState<Set<string>>(new Set())
  const [typingUsers, setTypingUsers] = useState<Set<string>>(new Set())

  useEffect(() => {
    if (!token) return

    const socketUrl = process.env.NEXT_PUBLIC_WEBSOCKET_URL || 'http://localhost:3001'

    // Socket.io 클라이언트 초기화
    const newSocket = io(socketUrl, {
      auth: {
        token,
      },
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: 5,
    })

    // 연결 성공
    newSocket.on('connection:success', (data) => {
      console.info('Socket.io 연결 성공', data)
      setConnected(true)
    })

    // 메시지 수신
    newSocket.on('message:receive', (message: Message) => {
      setMessages((prev) => [...prev, message])
    })

    // 메시지 전송 확인
    newSocket.on('message:sent', (message: Message) => {
      setMessages((prev) =>
        [...prev, message].sort(
          (a, b) =>
            new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
        )
      )
    })

    // 메시지 읽음 표시
    newSocket.on('message:read:notification', (data) => {
      setMessages((prev) =>
        prev.map((msg) =>
          data.messageIds.includes(msg.id) ? { ...msg, isRead: true } : msg
        )
      )
    })

    // 타이핑 표시
    newSocket.on('message:typing', (data: { userId: string }) => {
      setTypingUsers((prev) => new Set([...prev, data.userId]))
    })

    // 타이핑 중지
    newSocket.on('message:stopped-typing', (data: { userId: string }) => {
      setTypingUsers((prev) => {
        const newSet = new Set(prev)
        newSet.delete(data.userId)
        return newSet
      })
    })

    // 사용자 입장
    newSocket.on('user:joined', (data: { userId: string }) => {
      setOnlineUsers((prev) => new Set([...prev, data.userId]))
    })

    // 사용자 퇴장
    newSocket.on('user:left', (data: { userId: string }) => {
      setOnlineUsers((prev) => {
        const newSet = new Set(prev)
        newSet.delete(data.userId)
        return newSet
      })
    })

    // 상태 업데이트
    newSocket.on('presence:updated', (data) => {
      if (data.status === 'offline') {
        setOnlineUsers((prev) => {
          const newSet = new Set(prev)
          newSet.delete(data.userId)
          return newSet
        })
      } else {
        setOnlineUsers((prev) => new Set([...prev, data.userId]))
      }
    })

    // 연결 해제
    newSocket.on('disconnect', () => {
      console.warn('Socket.io 연결 해제')
      setConnected(false)
    })

    // 에러 처리
    newSocket.on('error', (error) => {
      console.error('Socket.io 에러', { error })
    })

    newSocket.on('connect_error', (error) => {
      console.error('Socket.io 연결 에러', { error })
    })

    setSocket(newSocket)

    // 정리
    return () => {
      newSocket.disconnect()
    }
  }, [token])

  return (
    <SocketContext.Provider
      value={{
        socket,
        connected,
        messages,
        onlineUsers,
        typingUsers,
      }}
    >
      {children}
    </SocketContext.Provider>
  )
}

/**
 * Socket Context 반환
 */
export function useSocketContext(): SocketContextType {
  const context = React.useContext(SocketContext)
  if (!context) {
    throw new Error('useSocketContext는 SocketProvider 내에서 사용되어야 합니다')
  }
  return context
}

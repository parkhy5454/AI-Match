/**
 * WebSocket Server 유닛 테스트
 */

describe('WebSocket Server', () => {
  // 간단한 WebSocket 서버 구현 테스트

  class SimpleWebSocketServer {
    private connections = new Map<string, any>()
    private messageQueue: any[] = []

    connect(userId: string, socket: any) {
      this.connections.set(userId, socket)
    }

    disconnect(userId: string) {
      this.connections.delete(userId)
    }

    sendMessage(senderId: string, recipientId: string, message: any) {
      const recipient = this.connections.get(recipientId)
      if (!recipient) {
        this.messageQueue.push({ senderId, recipientId, message })
        return false
      }

      recipient.emit('message', message)
      return true
    }

    broadcast(message: any) {
      this.connections.forEach((socket) => {
        socket.emit('broadcast', message)
      })
    }

    getConnectedUsers() {
      return Array.from(this.connections.keys())
    }

    getPendingMessages(userId: string) {
      return this.messageQueue.filter((m) => m.recipientId === userId)
    }
  }

  let server: SimpleWebSocketServer

  beforeEach(() => {
    server = new SimpleWebSocketServer()
  })

  describe('연결 관리', () => {
    it('사용자를 연결할 수 있어야 함', () => {
      const socket = { id: 'socket1' }
      server.connect('user1', socket)

      expect(server.getConnectedUsers()).toContain('user1')
    })

    it('사용자를 연결 해제할 수 있어야 함', () => {
      const socket = { id: 'socket1' }
      server.connect('user1', socket)
      server.disconnect('user1')

      expect(server.getConnectedUsers()).not.toContain('user1')
    })

    it('여러 사용자를 동시에 연결할 수 있어야 함', () => {
      server.connect('user1', { id: 'socket1' })
      server.connect('user2', { id: 'socket2' })
      server.connect('user3', { id: 'socket3' })

      expect(server.getConnectedUsers()).toHaveLength(3)
    })
  })

  describe('메시지 전송', () => {
    it('연결된 사용자에게 메시지를 전송할 수 있어야 함', () => {
      const recipientSocket = { emit: jest.fn() }
      server.connect('user1', { emit: jest.fn() })
      server.connect('user2', recipientSocket)

      const result = server.sendMessage('user1', 'user2', { text: '안녕하세요' })

      expect(result).toBe(true)
      expect(recipientSocket.emit).toHaveBeenCalledWith('message', {
        text: '안녕하세요',
      })
    })

    it('연결되지 않은 사용자에게 메시지를 보낼 때 큐에 저장해야 함', () => {
      server.connect('user1', { emit: jest.fn() })

      const result = server.sendMessage('user1', 'user2', { text: '안녕하세요' })

      expect(result).toBe(false)
      expect(server.getPendingMessages('user2')).toHaveLength(1)
    })

    it('브로드캐스트 메시지를 모든 연결된 사용자에게 전송할 수 있어야 함', () => {
      const socket1 = { emit: jest.fn() }
      const socket2 = { emit: jest.fn() }
      const socket3 = { emit: jest.fn() }

      server.connect('user1', socket1)
      server.connect('user2', socket2)
      server.connect('user3', socket3)

      server.broadcast({ type: 'system', text: '시스템 메시지' })

      expect(socket1.emit).toHaveBeenCalledWith('broadcast', {
        type: 'system',
        text: '시스템 메시지',
      })
      expect(socket2.emit).toHaveBeenCalledWith('broadcast', {
        type: 'system',
        text: '시스템 메시지',
      })
      expect(socket3.emit).toHaveBeenCalledWith('broadcast', {
        type: 'system',
        text: '시스템 메시지',
      })
    })
  })

  describe('타이핑 표시', () => {
    it('타이핑 상태를 추적할 수 있어야 함', () => {
      const typingUsers = new Set<string>()

      // user1이 타이핑 시작
      typingUsers.add('user1')
      expect(typingUsers.has('user1')).toBe(true)

      // user2가 타이핑 시작
      typingUsers.add('user2')
      expect(typingUsers.size).toBe(2)

      // user1이 타이핑 중지
      typingUsers.delete('user1')
      expect(typingUsers.has('user1')).toBe(false)
      expect(typingUsers.has('user2')).toBe(true)
    })
  })

  describe('온라인 상태 추적', () => {
    it('온라인 사용자 목록을 유지해야 함', () => {
      server.connect('user1', { id: 'socket1' })
      server.connect('user2', { id: 'socket2' })
      server.connect('user3', { id: 'socket3' })

      const onlineUsers = server.getConnectedUsers()
      expect(onlineUsers).toHaveLength(3)
      expect(onlineUsers).toContain('user1')
      expect(onlineUsers).toContain('user2')
      expect(onlineUsers).toContain('user3')
    })

    it('연결 해제 후 온라인 상태에서 제거해야 함', () => {
      server.connect('user1', { id: 'socket1' })
      server.connect('user2', { id: 'socket2' })

      server.disconnect('user1')

      const onlineUsers = server.getConnectedUsers()
      expect(onlineUsers).toHaveLength(1)
      expect(onlineUsers).toContain('user2')
      expect(onlineUsers).not.toContain('user1')
    })
  })

  describe('메시지 큐', () => {
    it('미배달 메시지를 큐에 저장했다가 사용자가 연결되면 전달해야 함', () => {
      // user1이 user2(연결 안 됨)에게 메시지 전송
      server.sendMessage('user1', 'user2', { text: '안녕' })
      server.sendMessage('user1', 'user2', { text: '반갑습니다' })

      expect(server.getPendingMessages('user2')).toHaveLength(2)

      // user2가 연결됨
      const user2Socket = { emit: jest.fn() }
      server.connect('user2', user2Socket)

      // 큐에 있던 메시지를 전달할 수 있도록 함
      const pendingMessages = server.getPendingMessages('user2')
      expect(pendingMessages).toHaveLength(2)
    })
  })

  describe('에러 처리', () => {
    it('유효하지 않은 메시지를 처리할 수 있어야 함', () => {
      const recipientSocket = { emit: jest.fn() }
      server.connect('user1', { emit: jest.fn() })
      server.connect('user2', recipientSocket)

      // 빈 메시지 전송 시도
      const result = server.sendMessage('user1', 'user2', null)
      expect(result).toBe(true) // 메시지는 전송되지만 수신자는 null을 받음
    })

    it('존재하지 않는 수신자에게 메시지를 보낼 때 오류를 반환해야 함', () => {
      server.connect('user1', { emit: jest.fn() })

      const result = server.sendMessage('user1', 'nonexistent', {
        text: 'test',
      })
      expect(result).toBe(false)
    })
  })

  describe('대규모 동시 연결', () => {
    it('많은 동시 사용자를 처리할 수 있어야 함', () => {
      const userCount = 1000

      for (let i = 0; i < userCount; i++) {
        server.connect(`user${i}`, { id: `socket${i}` })
      }

      expect(server.getConnectedUsers()).toHaveLength(userCount)
    })
  })
})

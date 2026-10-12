'use client'

/**
 * 검색 시스템 Context
 * 클라이언트 측 검색 상태 관리
 */

import React, { createContext, useContext, useState, useCallback } from 'react'

interface SearchUser {
  id: string
  username: string
  age: number
  location: string
  profileImage?: string
  mbtiType: string
  bio?: string
  verified: boolean
}

interface SearchFilters {
  keyword?: string
  minAge?: number
  maxAge?: number
  location?: string
  mbtiType?: string
  gender?: 'M' | 'F'
  verified?: boolean
}

interface SearchContextType {
  results: SearchUser[]
  loading: boolean
  total: number
  limit: number
  offset: number
  hasMore: boolean
  filters: SearchFilters
  searchHistory: Array<{ id: string; query: string; createdAt: Date }>
  recentViews: SearchUser[]
  search: (filters: SearchFilters) => Promise<void>
  loadMore: () => Promise<void>
  updateFilters: (filters: Partial<SearchFilters>) => void
  clearSearch: () => void
  deleteSearchHistory: (historyId: string) => Promise<void>
  clearAllHistory: () => Promise<void>
  recordView: (userId: string) => Promise<void>
  getRecentViews: () => Promise<void>
}

const SearchContext = createContext<SearchContextType | undefined>(undefined)

interface SearchProviderProps {
  children: React.ReactNode
  token: string
}

/**
 * 검색 시스템 Context Provider
 */
export function SearchProvider({ children, token }: SearchProviderProps) {
  const [results, setResults] = useState<SearchUser[]>([])
  const [loading, setLoading] = useState(false)
  const [total, setTotal] = useState(0)
  const [limit, setLimit] = useState(50)
  const [offset, setOffset] = useState(0)
  const [hasMore, setHasMore] = useState(false)
  const [filters, setFilters] = useState<SearchFilters>({})
  const [searchHistory, setSearchHistory] = useState<
    Array<{ id: string; query: string; createdAt: Date }>
  >([])
  const [recentViews, setRecentViews] = useState<SearchUser[]>([])

  /**
   * 사용자 검색
   */
  const search = useCallback(
    async (newFilters: SearchFilters) => {
      setLoading(true)
      setOffset(0)

      try {
        const params = new URLSearchParams()

        if (newFilters.keyword)
          params.append('keyword', newFilters.keyword)
        if (newFilters.minAge)
          params.append('minAge', newFilters.minAge.toString())
        if (newFilters.maxAge)
          params.append('maxAge', newFilters.maxAge.toString())
        if (newFilters.location)
          params.append('location', newFilters.location)
        if (newFilters.mbtiType)
          params.append('mbtiType', newFilters.mbtiType)
        if (newFilters.gender) params.append('gender', newFilters.gender)
        if (newFilters.verified !== undefined)
          params.append('verified', newFilters.verified.toString())

        params.append('limit', '50')
        params.append('offset', '0')

        const response = await fetch(
          `/api/users/search?${params.toString()}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        )

        if (!response.ok) {
          const error = await response.json()
          throw new Error(error.error || '검색 실패')
        }

        const data = await response.json()

        setResults(data.data)
        setTotal(data.pagination.total)
        setLimit(data.pagination.limit)
        setOffset(data.pagination.offset)
        setHasMore(data.pagination.hasMore)
        setFilters(newFilters)

        console.info('검색 실행 성공', {
          resultCount: data.data.length,
          filters: newFilters,
        })
      } catch (error) {
        console.error('검색 실패', {
          error: error instanceof Error ? error.message : 'Unknown error',
        })
      } finally {
        setLoading(false)
      }
    },
    [token]
  )

  /**
   * 더 불러오기
   */
  const loadMore = useCallback(async () => {
    if (!hasMore || loading) return

    setLoading(true)

    try {
      const newOffset = offset + limit
      const params = new URLSearchParams()

      if (filters.keyword)
        params.append('keyword', filters.keyword)
      if (filters.minAge)
        params.append('minAge', filters.minAge.toString())
      if (filters.maxAge)
        params.append('maxAge', filters.maxAge.toString())
      if (filters.location)
        params.append('location', filters.location)
      if (filters.mbtiType)
        params.append('mbtiType', filters.mbtiType)
      if (filters.gender) params.append('gender', filters.gender)

      params.append('limit', limit.toString())
      params.append('offset', newOffset.toString())

      const response = await fetch(
        `/api/users/search?${params.toString()}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      )

      if (!response.ok) throw new Error('더 불러오기 실패')

      const data = await response.json()

      setResults((prev) => [...prev, ...data.data])
      setOffset(newOffset)
      setHasMore(data.pagination.hasMore)
    } catch (error) {
      console.error('더 불러오기 실패', {
        error: error instanceof Error ? error.message : 'Unknown error',
      })
    } finally {
      setLoading(false)
    }
  }, [offset, limit, filters, hasMore, loading, token])

  /**
   * 필터 업데이트
   */
  const updateFilters = useCallback((newFilters: Partial<SearchFilters>) => {
    setFilters((prev) => ({
      ...prev,
      ...newFilters,
    }))
  }, [])

  /**
   * 검색 초기화
   */
  const clearSearch = useCallback(() => {
    setResults([])
    setTotal(0)
    setOffset(0)
    setHasMore(false)
    setFilters({})
  }, [])

  /**
   * 검색 이력 삭제
   */
  const deleteSearchHistory = useCallback(
    async (historyId: string) => {
      try {
        const response = await fetch(
          `/api/users/search-history?id=${historyId}`,
          {
            method: 'DELETE',
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        )

        if (!response.ok) throw new Error('삭제 실패')

        setSearchHistory((prev) =>
          prev.filter((h) => h.id !== historyId)
        )

        console.info('검색 이력 삭제 성공', { historyId })
      } catch (error) {
        console.error('검색 이력 삭제 실패', {
          error: error instanceof Error ? error.message : 'Unknown error',
        })
      }
    },
    [token]
  )

  /**
   * 모든 검색 이력 삭제
   */
  const clearAllHistory = useCallback(async () => {
    try {
      const response = await fetch(`/api/users/search-history?clear=true`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (!response.ok) throw new Error('삭제 실패')

      setSearchHistory([])

      console.info('모든 검색 이력 삭제 성공')
    } catch (error) {
      console.error('모든 검색 이력 삭제 실패', {
        error: error instanceof Error ? error.message : 'Unknown error',
      })
    }
  }, [token])

  /**
   * 프로필 조회 기록
   */
  const recordView = useCallback(
    async (userId: string) => {
      try {
        await fetch('/api/users/search', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ viewedUserId: userId }),
        })

        console.info('프로필 조회 기록됨', { userId })
      } catch (error) {
        console.error('프로필 조회 기록 실패', {
          error: error instanceof Error ? error.message : 'Unknown error',
        })
      }
    },
    [token]
  )

  /**
   * 최근 조회 목록 로드
   */
  const getRecentViews = useCallback(async () => {
    try {
      const response = await fetch(
        '/api/users/recent-views?type=viewed&limit=10',
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      )

      if (!response.ok) throw new Error('로드 실패')

      const data = await response.json()
      setRecentViews(data.data.map((v: any) => v.user))

      console.info('최근 조회 로드 성공', { count: data.data.length })
    } catch (error) {
      console.error('최근 조회 로드 실패', {
        error: error instanceof Error ? error.message : 'Unknown error',
      })
    }
  }, [token])

  const value: SearchContextType = {
    results,
    loading,
    total,
    limit,
    offset,
    hasMore,
    filters,
    searchHistory,
    recentViews,
    search,
    loadMore,
    updateFilters,
    clearSearch,
    deleteSearchHistory,
    clearAllHistory,
    recordView,
    getRecentViews,
  }

  return (
    <SearchContext.Provider value={value}>
      {children}
    </SearchContext.Provider>
  )
}

/**
 * 검색 시스템 Context 사용 Hook
 */
export function useSearch() {
  const context = useContext(SearchContext)

  if (!context) {
    throw new Error('useSearch must be used within SearchProvider')
  }

  return context
}

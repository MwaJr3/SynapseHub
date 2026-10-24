import { createContext, useContext, useEffect } from 'react'
import type { ReactNode } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { BookOpen, RefreshCw } from 'lucide-react'
import { getSession, setSessionToken } from './api'
import type { SessionInfo } from './types'
import { useTheme } from './theme'

const SessionContext = createContext<{
  session: SessionInfo
  acceptSession: (data: SessionInfo) => void
} | null>(null)
export function SessionProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient()
  const query = useQuery({ queryKey: ['session'], queryFn: getSession, staleTime: 5 * 60 * 1000, retry: 1 })
  const { setTheme } = useTheme()
  const userId = query.data?.user.id
  useEffect(() => {
    if (query.data?.user.preferences.theme) setTheme(query.data.user.preferences.theme)
  }, [userId]) // Remote defaults apply when account identity changes.
  if (query.isPending)
    return (
      <div className="boot-screen">
        <div className="brand-mark">
          <BookOpen size={27} />
        </div>
        <strong>TranscriptWise</strong>
        <span className="muted">Opening your learning workspace…</span>
        <div className="loading-line" />
      </div>
    )
  if (query.isError)
    return (
      <div className="boot-screen">
        <BookOpen size={36} />
        <h1>Let’s reconnect.</h1>
        <p className="muted">{query.error.message}</p>
        <button className="button primary" onClick={() => query.refetch()}>
          <RefreshCw size={16} /> Try again
        </button>
      </div>
    )
  const acceptSession = (data: SessionInfo) => {
    setSessionToken(data)
    queryClient.setQueryData(['session'], data)
    queryClient.invalidateQueries({ predicate: (q) => q.queryKey[0] !== 'session' })
  }
  return (
    <SessionContext.Provider value={{ session: query.data, acceptSession }}>
      {children}
    </SessionContext.Provider>
  )
}
export function useSession() {
  const value = useContext(SessionContext)
  if (!value) throw new Error('SessionProvider is required')
  return value
}

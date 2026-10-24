import { createContext, useContext, useState } from 'react'
import type { ReactNode } from 'react'
import { AuthDialog } from '../components/AuthDialog'
const AuthContext = createContext<(mode?: 'login' | 'register', after?: () => void) => void>(() => {})
export function UIProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<{ mode: 'login' | 'register'; after?: () => void } | null>(null)
  return (
    <AuthContext.Provider value={(mode = 'register', after) => setState({ mode, after })}>
      {children}
      <AuthDialog
        open={!!state}
        mode={state?.mode || 'register'}
        onClose={() => setState(null)}
        onSuccess={() => {
          const callback = state?.after
          setState(null)
          callback?.()
        }}
      />
    </AuthContext.Provider>
  )
}
export const useAuthDialog = () => useContext(AuthContext)

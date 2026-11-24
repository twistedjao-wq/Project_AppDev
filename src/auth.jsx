import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import { api, clearToken, getToken, setToken } from './api'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(Boolean(getToken()))

  // On page load, check the saved token is still valid.
  useEffect(() => {
    if (!getToken()) return
    api.me()
      .then(({ user: me }) => setUser(me))
      .catch(() => clearToken())
      .finally(() => setLoading(false))
  }, [])

  const signIn = useCallback((token, me) => {
    setToken(token)
    setUser(me)
  }, [])

  const signOut = useCallback(() => {
    clearToken()
    setUser(null)
  }, [])

  return (
    <AuthContext.Provider value={{ user, loading, signIn, signOut, setUser }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)

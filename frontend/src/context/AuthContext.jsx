import { createContext, useContext, useEffect, useState } from "react"
import { api, getToken, setToken } from "../api"

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!getToken()) { setLoading(false); return }
    api.getMe()
      .then(data => setUser(data))
      .catch(() => setUser(null))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    const handle = () => { setToken(null); setUser(null) }
    window.addEventListener("pip:unauthorized", handle)
    return () => window.removeEventListener("pip:unauthorized", handle)
  }, [])

  const login = (userData) => setUser(userData)

  const logout = () => {
    api.logout()
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}

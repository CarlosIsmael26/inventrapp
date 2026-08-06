import {
  createContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react'
import {
  onAuthStateChanged,
  type User,
} from 'firebase/auth'

import { auth } from '../config/firebase'
import { getUserProfile } from '../services'
import type { UserProfile } from '../types/UserProfile'

type AuthContextValue = {
  user: User | null
  profile: UserProfile | null
  loading: boolean
}

export const AuthContext = createContext<AuthContextValue | undefined>(
  undefined,
)

type AuthProviderProps = {
  children: ReactNode
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(
      auth,
      async (firebaseUser) => {
        setLoading(true)
        setUser(firebaseUser)

        try {
          if (firebaseUser) {
            const userProfile = await getUserProfile(
              firebaseUser.uid,
            )

            setProfile(userProfile)
          } else {
            setProfile(null)
          }
        } catch (error) {
          console.error(
            'Error al cargar el perfil:',
            error,
          )

          setProfile(null)
        } finally {
          setLoading(false)
        }
      },
    )

    return unsubscribe
  }, [])

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        loading,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}
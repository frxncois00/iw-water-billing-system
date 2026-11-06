import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'
import { supabase } from '../lib/supabaseClient.js'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [identityError, setIdentityError] = useState('')
  const [guestFlow, setGuestFlow] = useState(false)
  const generation = useRef(0)

  const loadIdentity = useCallback(async (currentSession) => {
    const id = ++generation.current
    if (!currentSession?.user) {
      setSession(null)
      setProfile(null)

      setIdentityError('')
      setLoading(false)
      return
    }
    setSession(currentSession)
    setLoading(true)
    try {
      const { data: nextProfile, error } = await supabase.from('profiles').select('*').eq('id', currentSession.user.id).single()
      if (error) throw error
      if (!['admin', 'cashier', 'customer'].includes(nextProfile?.role)) throw new Error('Your account has no assigned role. Contact the administrator.')
      if (id === generation.current) {
        setProfile(nextProfile)
        setIdentityError('')
      }
    } catch (error) {
      if (id === generation.current) {
        console.error('Could not load account:', error)
        setProfile(null)

        setIdentityError(error.message || 'Could not load your account.')
      }
    } finally {
      if (id === generation.current) setLoading(false)
    }
  }, [])

  useEffect(() => {
    let active = true
    supabase.auth.getSession().then(({ data }) => {
      if (active) loadIdentity(data.session)
    }).catch(() => { if (active) setLoading(false) })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      // Delay database requests until the auth callback releases its internal lock.
      setTimeout(() => { if (active) loadIdentity(nextSession) }, 0)
    })
    return () => { active = false; subscription.unsubscribe(); generation.current += 1 }
  }, [loadIdentity])

  const refreshIdentity = useCallback(async () => {
    const { data } = await supabase.auth.getSession()
    await loadIdentity(data.session)
  }, [loadIdentity])

  const signOut = useCallback(async () => {
    await supabase.auth.signOut()
    await loadIdentity(null)
  }, [loadIdentity])

  const signIn = useCallback(async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email: email.trim(), password })
    if (error) throw error
    const { data: nextProfile, error: profileError } = await supabase.from('profiles').select('role').eq('id', data.user.id).single()
    if (profileError || !['admin', 'cashier', 'customer'].includes(nextProfile?.role)) {
      await supabase.auth.signOut()
      await loadIdentity(null)
      throw new Error('Your account has no assigned role. Contact the administrator.')
    }
    await loadIdentity(data.session)
    return nextProfile.role
  }, [loadIdentity])

  return <AuthContext.Provider value={{ session, user: session?.user, profile, role: profile?.role, loading, identityError, guestFlow, setGuestFlow, refreshIdentity, signIn, signOut }}>
    {children}
  </AuthContext.Provider>
}

export const useAuth = () => useContext(AuthContext)

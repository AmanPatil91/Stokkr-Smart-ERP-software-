'use client'

import { createContext, useContext, useEffect, useState, useMemo, ReactNode } from 'react'
import { createClient } from '@/utils/supabase/client'
import { User } from '@supabase/supabase-js'

type AuthContextType = {
    user: User | null
    role: string | null
    loading: boolean
}

const AuthContext = createContext<AuthContextType>({
    user: null,
    role: null,
    loading: true,
})

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<User | null>(null)
    const [role, setRole] = useState<string | null>(null)
    const [loading, setLoading] = useState(true)
    // Memoize the supabase client so it doesn't get recreated on every render
    const supabase = useMemo(() => createClient(), [])

    useEffect(() => {
        let mounted = true

        // Safety timeout: if auth check takes too long (bad credentials, network issues),
        // force loading to false so the app doesn't show a white screen forever
        const timeout = setTimeout(() => {
            if (mounted) {
                console.warn('AuthProvider: Auth check timed out after 5s, proceeding without auth')
                setLoading(false)
            }
        }, 5000)

        async function getSession() {
            try {
                const { data: { session } } = await supabase.auth.getSession()

                if (session?.user && mounted) {
                    setUser(session.user)
                    // Fetch profile to get the role
                    const { data: profile } = await supabase
                        .from('Profile')
                        .select('role')
                        .eq('id', session.user.id)
                        .single()

                    if (profile) {
                        setRole(profile.role)
                    } else {
                        // default fallback if profile isn't ready immediately due to trigger delay
                        setRole('sales')
                    }
                }
            } catch (err) {
                console.error('AuthProvider: Failed to get session', err)
            }
            if (mounted) {
                clearTimeout(timeout)
                setLoading(false)
            }
        }

        getSession()

        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
            if (session?.user) {
                setUser(session.user)
                const { data: profile } = await supabase
                    .from('Profile')
                    .select('role')
                    .eq('id', session.user.id)
                    .single()
                setRole(profile?.role || 'sales')
            } else {
                setUser(null)
                setRole(null)
            }
            setLoading(false)
        })

        return () => {
            mounted = false
            clearTimeout(timeout)
            subscription.unsubscribe()
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    return (
        <AuthContext.Provider value={{ user, role, loading }}>
            {children}
        </AuthContext.Provider>
    )
}

export const useAuth = () => useContext(AuthContext)

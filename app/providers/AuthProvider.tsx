'use client'

import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
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
    const supabase = createClient()

    useEffect(() => {
        let mounted = true

        async function getSession() {
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
            if (mounted) setLoading(false)
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
            subscription.unsubscribe()
        }
    }, [supabase])

    return (
        <AuthContext.Provider value={{ user, role, loading }}>
            {children}
        </AuthContext.Provider>
    )
}

export const useAuth = () => useContext(AuthContext)

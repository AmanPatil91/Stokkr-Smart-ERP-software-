'use client'

import { useAuth } from '@/app/providers/AuthProvider'
import { ReactNode } from 'react'
import { useRouter } from 'next/navigation'

type RoleGuardProps = {
    children: ReactNode
    allowedRoles: string[]
    fallback?: ReactNode // Optional message or alternative UI
}

export function RoleGuard({ children, allowedRoles, fallback }: RoleGuardProps) {
    const { role, loading } = useAuth()

    if (loading) {
        return null // or a loading skeleton
    }

    // Admin always has access to everything by default, unless otherwise specified
    if (role && (allowedRoles.includes(role) || role === 'admin')) {
        return <>{children}</>
    }

    if (fallback) {
        return <>{fallback}</>
    }

    // Default unauthorized message
    return (
        <div className="p-4 rounded bg-red-50 text-red-600 border border-red-200">
            You do not have permission to perform this action.
        </div>
    )
}

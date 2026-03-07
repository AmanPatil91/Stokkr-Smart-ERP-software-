import { createClient } from '@/utils/supabase/server'
import { NextResponse } from 'next/server'
import { headers } from 'next/headers'

export async function requireApiAuth(allowedRoles?: string[]) {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        return { authorized: false, response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }), user: null, role: null }
    }

    const { data: profile } = await supabase
        .from('Profile')
        .select('role')
        .eq('id', user.id)
        .single()

    const role = profile?.role || 'sales'

    if (allowedRoles && !allowedRoles.includes(role) && role !== 'admin') {
        return { authorized: false, response: NextResponse.json({ error: 'You do not have permission to perform this action.' }, { status: 403 }), user, role }
    }

    return { authorized: true, response: null, user, role }
}

import { updateSession } from '@/utils/supabase/middleware'
import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
    // Update session to keep it active
    const response = await updateSession(request)

    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                getAll() {
                    return request.cookies.getAll()
                },
                setAll(cookiesToSet) {
                    cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
                },
            },
        }
    )

    const { data: { user } } = await supabase.auth.getUser()

    // Protect /login route if already logged in
    if (user && request.nextUrl.pathname.startsWith('/login')) {
        return NextResponse.redirect(new URL('/', request.url))
    }

    // Restrict unauthenticated users from accessing protected pages (everything except /login)
    if (!user && !request.nextUrl.pathname.startsWith('/login') && !request.nextUrl.pathname.startsWith('/api') && !request.nextUrl.pathname.startsWith('/_next')) {
        return NextResponse.redirect(new URL('/login', request.url))
    }

    // If user is authenticated, we enforce role-based access for page routes
    if (user && !request.nextUrl.pathname.startsWith('/api') && !request.nextUrl.pathname.startsWith('/_next')) {
        const { data: profile } = await supabase
            .from('Profile')
            .select('role')
            .eq('id', user.id)
            .single()

        const role = profile?.role || 'sales'

        const path = request.nextUrl.pathname

        // Admin has full access everywhere. Add logic to others.
        if (role !== 'admin') {
            if (path.startsWith('/settings')) {
                return NextResponse.redirect(new URL('/', request.url)) // Dashboard
            }

            if (path.startsWith('/inventory')) {
                // Sales can view products, but cannot access add-batch
                if (path.startsWith('/inventory/products')) {
                    if (!['manager', 'sales'].includes(role)) {
                        return NextResponse.redirect(new URL('/', request.url))
                    }
                } else {
                    if (!['manager'].includes(role)) {
                        return NextResponse.redirect(new URL('/', request.url))
                    }
                }
            }

            if (path.startsWith('/reports') || path.startsWith('/analytics')) {
                if (!['manager', 'accountant'].includes(role)) {
                    return NextResponse.redirect(new URL('/', request.url))
                }
            }

            if (path.startsWith('/billing') || path.startsWith('/sales') || path.startsWith('/invoices')) {
                if (!['sales'].includes(role)) {
                    return NextResponse.redirect(new URL('/', request.url))
                }
            }

            if (path.startsWith('/payments') || path.startsWith('/accounts-receivable') || path.startsWith('/accounts-payable')) {
                if (!['accountant'].includes(role)) {
                    return NextResponse.redirect(new URL('/', request.url))
                }
            }
        }
    }

    return response
}

export const config = {
    matcher: [
        /*
         * Match all request paths except for the ones starting with:
         * - _next/static (static files)
         * - _next/image (image optimization files)
         * - favicon.ico (favicon file)
         */
        '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
    ],
}

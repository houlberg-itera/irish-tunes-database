import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function middleware(req: NextRequest) {
  const res = NextResponse.next()

  // Create a Supabase client configured to use cookies
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return req.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => req.cookies.set(name, value))
          cookiesToSet.forEach(({ name, value, options }) =>
            res.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // Check if user is authenticated
  const {
    data: { session },
  } = await supabase.auth.getSession()

  console.log('Middleware check:', {
    path: req.nextUrl.pathname,
    hasSession: !!session,
    user: session?.user?.email,
  })

  // If no session and trying to access protected routes, redirect to login
  if (!session && !req.nextUrl.pathname.startsWith('/login') && !req.nextUrl.pathname.startsWith('/reset-password')) {
    const redirectUrl = req.nextUrl.clone()
    redirectUrl.pathname = '/login'
    console.log('Redirecting to login')
    return NextResponse.redirect(redirectUrl)
  }

  // If has session and trying to access login, redirect to home
  if (session && req.nextUrl.pathname.startsWith('/login')) {
    const redirectUrl = req.nextUrl.clone()
    redirectUrl.pathname = '/'
    console.log('Redirecting to home')
    return NextResponse.redirect(redirectUrl)
  }

  return res
}

export const config = {
  matcher: ['/', '/tunes/:path*', '/sets/:path*', '/popular', '/identify', '/admin', '/login', '/reset-password'],
}

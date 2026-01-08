import { createServerClient } from "@supabase/ssr"
import { NextResponse, type NextRequest } from "next/server"

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  // With Fluid compute, don't put this client in a global environment
  // variable. Always create a new one on each request.
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
          supabaseResponse = NextResponse.next({
            request,
          })
          // Configurar cookies com flags de segurança
          cookiesToSet.forEach(({ name, value, options }) => {
            const isProduction = process.env.NODE_ENV === "production"
            supabaseResponse.cookies.set(name, value, {
              ...options,
              httpOnly: options?.httpOnly ?? true,
              secure: options?.secure ?? isProduction,
              sameSite: options?.sameSite ?? ("lax" as const),
              path: options?.path ?? "/",
            })
          })
        },
      },
    },
  )

  // Do not run code between createServerClient and
  // supabase.auth.getUser(). A simple mistake could make it very hard to debug
  // issues with users being randomly logged out.

  // IMPORTANT: If you remove getUser() and you use server-side rendering
  // with the Supabase client, your users may be randomly logged out.
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const pathname = request.nextUrl.pathname

  const isPublicPath =
    pathname === "/" ||
    pathname === "/login" ||
    pathname === "/login" ||
    pathname.startsWith("/api/setup-users") ||
    pathname.startsWith("/api/create-profile") ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/_vercel") ||
    pathname.startsWith("/favicon")

  // If user is authenticated and trying to access login, redirect to dashboard
  if (user && pathname === "/login") {
    const url = request.nextUrl.clone()
    url.pathname = "/dashboard"
    return NextResponse.redirect(url)
  }

  // If no user and trying to access protected route, redirect to login
  if (!user && !isPublicPath) {
    const url = request.nextUrl.clone()
    url.pathname = "/login"
    return NextResponse.redirect(url)
  }

  // Adicionar headers de segurança
  const isProduction = process.env.NODE_ENV === "production"
  const isHttps = request.url.startsWith("https://") || isProduction

  // Headers de segurança
  supabaseResponse.headers.set("X-Frame-Options", "DENY")
  supabaseResponse.headers.set("X-Content-Type-Options", "nosniff")
  supabaseResponse.headers.set("Referrer-Policy", "strict-origin-when-cross-origin")
  supabaseResponse.headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=()")

  // HSTS apenas em HTTPS
  if (isHttps) {
    supabaseResponse.headers.set("Strict-Transport-Security", "max-age=31536000; includeSubDomains")
  }

  // Content Security Policy
  const csp = [
    "default-src 'self'",
    "script-src 'self' 'unsafe-eval' 'unsafe-inline' https://vercel.live",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: https:",
    "font-src 'self' data:",
    "object-src 'self' data:",
    "connect-src 'self' https://*.supabase.co https://*.supabase.in",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
  ].join("; ")

  supabaseResponse.headers.set("Content-Security-Policy", csp)

  // Headers de cache para rotas autenticadas
  if (user && !isPublicPath) {
    // Páginas autenticadas não devem ser cacheadas
    supabaseResponse.headers.set("Cache-Control", "private, no-cache, no-store, must-revalidate")
    supabaseResponse.headers.set("Pragma", "no-cache")
    supabaseResponse.headers.set("Expires", "0")
  } else if (isPublicPath && pathname !== "/login") {
    // Páginas públicas podem ter cache com revalidação
    supabaseResponse.headers.set("Cache-Control", "public, s-maxage=60, stale-while-revalidate=300")
  }

  // IMPORTANT: You *must* return the supabaseResponse object as it is.
  return supabaseResponse
}

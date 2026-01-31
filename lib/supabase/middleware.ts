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

  // Rotas públicas - NÃO incluir APIs sensíveis aqui
  const isPublicPath =
    pathname === "/" ||
    pathname === "/login" ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/_vercel") ||
    pathname.startsWith("/favicon")

  // APIs que fazem sua própria validação de autenticação
  // O middleware não redireciona para login, deixa a API responder adequadamente
  const isApiWithOwnAuth = pathname.startsWith("/api/create-profile")

  // If user is authenticated and trying to access login, redirect to dashboard
  if (user && pathname === "/login") {
    const url = request.nextUrl.clone()
    url.pathname = "/dashboard"
    return NextResponse.redirect(url)
  }

  // If no user and trying to access protected route, redirect to login
  // Exceção: APIs com autenticação própria não são redirecionadas
  if (!user && !isPublicPath && !isApiWithOwnAuth) {
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

  // Content Security Policy - mais restritivo em produção
  const cspDirectives = [
    "default-src 'self'",
    // Em produção: remove unsafe-eval, usa strict-dynamic
    // Em dev: mantém unsafe-eval para Hot Module Replacement
    isProduction
      ? "script-src 'self' 'strict-dynamic' https://vercel.live https://va.vercel-scripts.com"
      : "script-src 'self' 'unsafe-eval' 'unsafe-inline' https://vercel.live https://va.vercel-scripts.com",
    // Estilos: unsafe-inline necessário para CSS-in-JS/Tailwind
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: https: blob:",
    "font-src 'self' data:",
    "object-src 'none'", // Mais restritivo - bloqueia plugins
    "connect-src 'self' https://*.supabase.co https://*.supabase.in https://vercel.live https://va.vercel-scripts.com wss://*.supabase.co",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "upgrade-insecure-requests", // Força HTTPS em recursos
  ]

  // Em produção, usar Content-Security-Policy
  // Em desenvolvimento, usar report-only para não quebrar HMR
  const cspHeader = isProduction ? "Content-Security-Policy" : "Content-Security-Policy-Report-Only"
  supabaseResponse.headers.set(cspHeader, cspDirectives.join("; "))

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

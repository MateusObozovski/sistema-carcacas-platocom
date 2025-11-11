import { createServerClient } from "@supabase/ssr"
import { NextResponse, type NextRequest } from "next/server"

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

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
          cookiesToSet.forEach(({ name, value, options }) => supabaseResponse.cookies.set(name, value, options))
        },
      },
    },
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const pathname = request.nextUrl.pathname

  const isPublicPath =
    pathname === "/" ||
    pathname === "/login" ||
    pathname === "/setup" ||
    pathname.startsWith("/api/setup-users") ||
    pathname.startsWith("/api/create-profile") || // Added /api/create-profile to public paths for profile creation
    pathname.startsWith("/_next") ||
    pathname.startsWith("/_vercel") ||
    pathname.startsWith("/favicon")

  console.log("[v0] Middleware:", { pathname, hasUser: !!user, isPublicPath })

  // If user is authenticated and trying to access login, redirect to dashboard
  if (user && pathname === "/login") {
    const url = request.nextUrl.clone()
    url.pathname = "/dashboard"
    console.log("[v0] Redirecting authenticated user to dashboard")
    return NextResponse.redirect(url)
  }

  // If no user and trying to access protected route, redirect to login
  if (!user && !isPublicPath) {
    const url = request.nextUrl.clone()
    url.pathname = "/login"
    console.log("[v0] Redirecting unauthenticated user to login")
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}

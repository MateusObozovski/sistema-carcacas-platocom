"use client"

import { createContext, useContext, useState, useEffect, useRef, type ReactNode } from "react"
import type { User } from "./types"
import { createClient } from "./supabase/client"

interface AuthContextType {
  user: User | null
  login: (email: string, password: string) => Promise<boolean>
  logout: () => void
  isLoading: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const supabase = createClient()
  const creatingProfile = useRef(false)

  const createProfileViaAPI = async (userId: string, email: string, name: string, role: string) => {
    if (creatingProfile.current) {
      console.log("[v0] Profile creation already in progress, skipping...")
      return null
    }

    try {
      creatingProfile.current = true
      console.log("[v0] Creating profile via API:", { userId, email, name, role })

      const response = await fetch("/api/create-profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, email, name, role }),
      })

      if (response.status === 429) {
        console.error("[v0] Rate limit hit, will retry later")
        return null
      }

      const result = await response.json()

      if (!response.ok) {
        console.error("[v0] API error:", result.error)
        return null
      }

      console.log("[v0] Profile created successfully via API")
      return result.profile
    } catch (error) {
      console.error("[v0] API call failed:", error)
      return null
    } finally {
      setTimeout(() => {
        creatingProfile.current = false
      }, 2000)
    }
  }

  useEffect(() => {
    const checkSession = async () => {
      try {
        console.log("[v0] Checking session...")
        const {
          data: { session },
        } = await supabase.auth.getSession()

        if (session?.user) {
          console.log("[v0] Session exists, fetching profile...")
          const { data: profile, error: profileError } = await supabase
            .from("profiles")
            .select("*")
            .eq("id", session.user.id)
            .maybeSingle()

          if (profile) {
            setUser({
              id: profile.id,
              name: profile.nome,
              email: profile.email,
              role: profile.role,
            })
            console.log("[v0] User profile loaded:", profile.role)
          } else if (profileError) {
            console.error("[v0] Profile fetch error:", profileError.message)
          }
        }
      } catch (error) {
        console.error("[v0] Error checking session:", error)
      } finally {
        setIsLoading(false)
      }
    }

    checkSession()

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log("[v0] Auth state changed:", event)

      if (event === "SIGNED_OUT") {
        setUser(null)
        return
      }

      if (session?.user && event === "SIGNED_IN") {
        const { data: profile } = await supabase.from("profiles").select("*").eq("id", session.user.id).maybeSingle()

        if (profile) {
          setUser({
            id: profile.id,
            name: profile.nome,
            email: profile.email,
            role: profile.role,
          })
          console.log("[v0] User profile updated:", profile.role)
        }
      }
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [supabase])

  const login = async (email: string, password: string): Promise<boolean> => {
    try {
      console.log("[v0] Attempting login for:", email)

      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) {
        console.error("[v0] Login error:", error.message)
        return false
      }

      if (data.user) {
        console.log("[v0] Login successful, fetching profile...")
        const { data: profile, error: profileError } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", data.user.id)
          .maybeSingle()

        if (profileError) {
          console.error("[v0] Profile fetch error:", profileError.message)
          return false
        }

        if (profile) {
          setUser({
            id: profile.id,
            name: profile.nome,
            email: profile.email,
            role: profile.role,
          })
          console.log("[v0] Login complete, user role:", profile.role)
          return true
        } else {
          console.error("[v0] No profile found for user")
          return false
        }
      }

      return false
    } catch (error) {
      console.error("[v0] Login exception:", error)
      return false
    }
  }

  const logout = async () => {
    await supabase.auth.signOut()
    setUser(null)
  }

  return <AuthContext.Provider value={{ user, login, logout, isLoading }}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}

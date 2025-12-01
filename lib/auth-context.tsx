"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useRef,
  type ReactNode,
} from "react";
import type { User, UserRole } from "./types";
import { createClient } from "./supabase/client";

const APP_VERSION = "1.0.0";

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => void;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const supabase = createClient();
  const creatingProfile = useRef(false);

  // Timeout de segurança para não ficar travado em "Carregando..." para sempre
  useEffect(() => {
    const timeout = setTimeout(() => {
      setIsLoading(false);
    }, 5000); // 5 segundos

    return () => clearTimeout(timeout);
  }, []);

  // Limpeza de storage baseada em versão para evitar dados incompatíveis após deploys
  useEffect(() => {
    try {
      if (typeof window === "undefined") return;

      const storedVersion = localStorage.getItem("app_version");

      if (storedVersion !== APP_VERSION) {
        localStorage.clear();
        sessionStorage.clear();
        localStorage.setItem("app_version", APP_VERSION);
        console.log(`[v0] Storage resetado para versao ${APP_VERSION}`);
      }
    } catch (error) {
      console.error("[v0] Erro ao limpar storage por versao:", error);
    }
  }, []);

  const createProfileViaAPI = async (
    userId: string,
    email: string,
    name: string,
    role: string
  ) => {
    if (creatingProfile.current) {
      console.log("[v0] Profile creation already in progress, skipping...");
      return null;
    }

    try {
      creatingProfile.current = true;
      console.log("[v0] Creating profile via API:", {
        userId,
        email,
        name,
        role,
      });

      const response = await fetch("/api/create-profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, email, name, role }),
      });

      if (response.status === 429) {
        console.error("[v0] Rate limit hit, will retry later");
        return null;
      }

      const result = await response.json();

      if (!response.ok) {
        console.error("[v0] API error:", result.error);
        return null;
      }

      console.log("[v0] Profile created successfully via API:", result.profile);
      // Garantir que retornamos o profile completo
      if (result.profile) {
        return {
          id: result.profile.id,
          email: result.profile.email || email,
          nome: result.profile.nome || name,
          role: result.profile.role || role,
        };
      }
      return null;
    } catch (error) {
      console.error("[v0] API call failed:", error);
      return null;
    } finally {
      setTimeout(() => {
        creatingProfile.current = false;
      }, 2000);
    }
  };

  useEffect(() => {
    const checkSession = async () => {
      try {
        console.log("[v0] Checking session...");
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (session?.user) {
          console.log("[v0] Session exists, fetching profile...");
          const { data: profile, error: profileError } = await supabase
            .from("profiles")
            .select("*")
            .eq("id", session.user.id)
            .maybeSingle();

          if (profile) {
            const userRole = profile.role as UserRole;
            setUser({
              id: profile.id,
              name: profile.nome,
              email: profile.email,
              role: userRole,
            });
            console.log(
              "[v0] User profile loaded - role:",
              userRole,
              "profile.role:",
              profile.role
            );
          } else {
            if (profileError) {
              console.error(
                "[v0] Profile fetch error on checkSession:",
                profileError.message
              );
            } else {
              console.warn(
                "[v0] No profile found for user on checkSession:",
                session.user.id
              );
            }
            // Se houver sessão mas não houver profile, consideramos sessão inválida e fazemos sign out
            await supabase.auth.signOut();
            setUser(null);
          }
        }
      } catch (error) {
        console.error("[v0] Error checking session:", error);
      } finally {
        setIsLoading(false);
      }
    };

    checkSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log("[v0] Auth state changed:", event);

      if (event === "SIGNED_OUT") {
        setUser(null);
        return;
      }

      if (session?.user && event === "SIGNED_IN") {
        const { data: profile, error: profileError } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", session.user.id)
          .maybeSingle();

        if (profile) {
          const userRole = profile.role as UserRole;
          setUser({
            id: profile.id,
            name: profile.nome,
            email: profile.email,
            role: userRole,
          });
          console.log(
            "[v0] User profile updated - role:",
            userRole,
            "profile.role:",
            profile.role
          );
        } else {
          if (profileError) {
            console.error(
              "[v0] Profile fetch error after SIGNED_IN:",
              profileError.message
            );
          } else {
            console.warn(
              "[v0] No profile found after SIGNED_IN event for user:",
              session.user.id
            );
          }
          // Se não conseguimos obter profile após SIGNED_IN, força logout para permitir novo login limpo
          await supabase.auth.signOut();
          setUser(null);
        }
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [supabase]);

  const login = async (email: string, password: string): Promise<boolean> => {
    try {
      console.log("[v0] Attempting login for:", email);

      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        console.error("[v0] Login error:", error.message);
        return false;
      }

      if (data.user) {
        console.log(
          "[v0] Login successful, user ID:",
          data.user.id,
          "email:",
          data.user.email
        );
        console.log("[v0] Fetching profile...");

        const { data: profile, error: profileError } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", data.user.id)
          .maybeSingle();

        if (profileError) {
          console.error("[v0] Profile fetch error:", profileError);
          console.error("[v0] Error code:", profileError.code);
          console.error("[v0] Error message:", profileError.message);
          console.error(
            "[v0] Error details:",
            JSON.stringify(profileError, null, 2)
          );

          // Tentar criar profile automaticamente se não existir
          console.log("[v0] Attempting to create profile via API...");
          const createdProfile = await createProfileViaAPI(
            data.user.id,
            data.user.email || "",
            data.user.user_metadata?.nome ||
              data.user.email?.split("@")[0] ||
              "Usuário",
            data.user.user_metadata?.role || "Vendedor"
          );

          if (createdProfile) {
            const userRole = createdProfile.role as UserRole;
            setUser({
              id: createdProfile.id,
              name: createdProfile.nome,
              email: createdProfile.email,
              role: userRole,
            });
            console.log(
              "[v0] Profile created and login complete - role:",
              userRole
            );
            return true;
          }

          // Não foi possível criar profile, força logout para limpar sessão inválida
          await supabase.auth.signOut();
          setUser(null);
          return false;
        }

        if (profile) {
          const userRole = profile.role as UserRole;
          setUser({
            id: profile.id,
            name: profile.nome,
            email: profile.email,
            role: userRole,
          });
          console.log(
            "[v0] Login complete - role:",
            userRole,
            "profile.role:",
            profile.role
          );
          return true;
        } else {
          console.error("[v0] No profile found for user ID:", data.user.id);
          console.log("[v0] User metadata:", data.user.user_metadata);

          // Tentar criar profile automaticamente
          console.log("[v0] Attempting to create profile via API...");
          const createdProfile = await createProfileViaAPI(
            data.user.id,
            data.user.email || "",
            data.user.user_metadata?.nome ||
              data.user.email?.split("@")[0] ||
              "Usuário",
            data.user.user_metadata?.role || "Vendedor"
          );

          if (createdProfile) {
            const userRole = createdProfile.role as UserRole;
            setUser({
              id: createdProfile.id,
              name: createdProfile.nome,
              email: createdProfile.email,
              role: userRole,
            });
            console.log(
              "[v0] Profile created and login complete - role:",
              userRole
            );
            return true;
          }

          console.error("[v0] Failed to create profile, login aborted. Signing out.");
          await supabase.auth.signOut();
          setUser(null);
          return false;
        }
      }

      return false;
    } catch (error) {
      console.error("[v0] Login exception:", error);
      return false;
    }
  };

  const logout = async () => {
    await supabase.auth.signOut();
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

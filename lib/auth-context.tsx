"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useRef,
  useMemo,
  type ReactNode,
} from "react";
import type { User, UserRole } from "./types";
import { createClient } from "./supabase/client";

const APP_VERSION = "1.0.0";

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  // Usar useMemo para criar cliente Supabase uma única vez e evitar re-renderizações
  const supabase = useMemo(() => createClient(), []);
  const creatingProfile = useRef(false);
  // Flag para evitar processamento duplicado entre getSession e onAuthStateChange
  const isInitializing = useRef(false);
  // Flag para garantir que limpeza de storage execute apenas uma vez
  const storageCleaned = useRef(false);
  // Ref para debounce do onAuthStateChange
  const authStateChangeTimeout = useRef<NodeJS.Timeout | null>(null);
  // Ref para rastrear se usuário já foi carregado (evita processar INITIAL_SESSION repetidamente)
  const userLoaded = useRef(false);
  // Ref para rastrear o ID do usuário atual (evita processar SIGNED_IN para o mesmo usuário)
  const currentUserId = useRef<string | null>(null);

  // Timeout de segurança para não ficar travado em "Carregando..." para sempre
  useEffect(() => {
    const timeout = setTimeout(() => {
      setIsLoading(false);
    }, 5000); // 5 segundos

    return () => clearTimeout(timeout);
  }, []);

  // Limpeza de storage baseada em versão para evitar dados incompatíveis após deploys
  // Executa apenas uma vez e preserva sessão do Supabase
  useEffect(() => {
    try {
      if (typeof window === "undefined") return;
      
      // Executar apenas uma vez
      if (storageCleaned.current) {
        return;
      }

      const storedVersion = localStorage.getItem("app_version");

      if (storedVersion !== APP_VERSION) {
        // Preservar chaves do Supabase (todas as chaves que começam com 'sb-')
        const supabaseKeys: Record<string, string> = {};
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key && key.startsWith("sb-")) {
            supabaseKeys[key] = localStorage.getItem(key) || "";
          }
        }

        // Limpar storage
        localStorage.clear();
        sessionStorage.clear();

        // Restaurar chaves do Supabase
        Object.entries(supabaseKeys).forEach(([key, value]) => {
          localStorage.setItem(key, value);
        });

        // Salvar nova versão
        localStorage.setItem("app_version", APP_VERSION);
        storageCleaned.current = true;
        console.log(`[v0] Storage resetado para versao ${APP_VERSION} (sessão Supabase preservada)`);
      } else {
        // Mesmo que a versão esteja correta, marcar como limpo para evitar re-execução
        storageCleaned.current = true;
      }
    } catch (error) {
      console.error("[v0] Erro ao limpar storage por versao:", error);
      storageCleaned.current = true; // Marcar como limpo mesmo em caso de erro para evitar loop
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
    // Mounted flag para evitar atualizações após desmontagem
    let mounted = true;
    let subscription: { unsubscribe: () => void } | null = null;

    const checkSession = async () => {
      // Prevenir processamento duplicado
      if (isInitializing.current) {
        console.log("[v0] Session check already in progress, skipping...");
        return;
      }

      try {
        isInitializing.current = true;
        console.log("[v0] Checking session...");

        const {
          data: { session },
          error: sessionError,
        } = await supabase.auth.getSession();

        if (sessionError) {
          console.error("[v0] Session error:", sessionError);
          // Continuar para o finally garantir unlock
        } else if (mounted && session?.user) {
          console.log("[v0] Session exists, fetching profile...");

          try {
            const { data: profile, error: profileError } = await supabase
              .from("profiles")
              .select("*")
              .eq("id", session.user.id)
              .maybeSingle();

            if (!mounted) {
              return;
            }

            if (profile) {
              const userRole = profile.role as UserRole;
              setUser({
                id: profile.id,
                name: profile.nome,
                email: profile.email,
                role: userRole,
              });
              userLoaded.current = true;
              currentUserId.current = profile.id;
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
              if (mounted) {
                await supabase.auth.signOut();
                setUser(null);
                userLoaded.current = false;
                currentUserId.current = null;
              }
            }
          } catch (profileErr) {
            console.error("[v0] Error fetching profile:", profileErr);
          }
        } else if (mounted) {
          console.log("[v0] No active session found");
        }
      } catch (error) {
        console.error("[v0] Error checking session:", error);
      } finally {
        // GARANTIR que isLoading sempre seja false, mesmo em caso de erro
        if (mounted) {
          setIsLoading(false);
        }
        isInitializing.current = false;
      }
    };

    // Configurar listener de mudanças de autenticação com debounce
    const {
      data: { subscription: authSubscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      // Limpar timeout anterior se existir
      if (authStateChangeTimeout.current) {
        clearTimeout(authStateChangeTimeout.current);
      }

      // Debounce de 500ms para evitar processamento duplicado
      authStateChangeTimeout.current = setTimeout(async () => {
        // Prevenir processamento se já estiver inicializando
        if (isInitializing.current && event === "SIGNED_IN") {
          console.log(
            "[v0] Initial session check in progress, skipping SIGNED_IN event"
          );
          return;
        }

        // Ignorar INITIAL_SESSION se já houver usuário carregado (evita loop)
        if (event === "INITIAL_SESSION" && userLoaded.current) {
          console.log(
            "[v0] INITIAL_SESSION event ignored - user already loaded"
          );
          return;
        }

        if (!mounted) {
          return;
        }

        console.log("[v0] Auth state changed:", event);

        if (event === "SIGNED_OUT") {
          if (mounted) {
            setUser(null);
            userLoaded.current = false;
            currentUserId.current = null;
          }
          return;
        }

        if (session?.user && event === "SIGNED_IN") {
          // Ignorar SIGNED_IN se já houver usuário carregado e for o mesmo usuário
          // Isso previne loops causados por hot reload ou re-montagem do componente
          if (userLoaded.current && currentUserId.current === session.user.id) {
            console.log(
              "[v0] SIGNED_IN event ignored - same user already loaded:",
              session.user.id
            );
            return;
          }

          try {
            const { data: profile, error: profileError } = await supabase
              .from("profiles")
              .select("*")
              .eq("id", session.user.id)
              .maybeSingle();

            if (!mounted) {
              return;
            }

            if (profile) {
              const userRole = profile.role as UserRole;
              setUser({
                id: profile.id,
                name: profile.nome,
                email: profile.email,
                role: userRole,
              });
              userLoaded.current = true;
              currentUserId.current = profile.id;
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
              if (mounted) {
                await supabase.auth.signOut();
                setUser(null);
                userLoaded.current = false;
                currentUserId.current = null;
              }
            }
          } catch (error) {
            console.error("[v0] Error in auth state change handler:", error);
          }
        }
      }, 500); // Debounce de 500ms
    });

    subscription = authSubscription;

    // Executar verificação inicial de sessão
    checkSession();

    // Cleanup function
    return () => {
      mounted = false;
      isInitializing.current = false;
      userLoaded.current = false;
      currentUserId.current = null;
      if (authStateChangeTimeout.current) {
        clearTimeout(authStateChangeTimeout.current);
      }
      if (subscription) {
        subscription.unsubscribe();
      }
    };
    // Remover supabase das dependências para evitar loop infinito
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const login = async (email: string, password: string): Promise<{ success: boolean; error?: string }> => {
    try {
      console.log("[v0] Attempting login for:", email);

      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        // Don't error on invalid credentials, just warn
        if (error.message === "Invalid login credentials") {
          console.warn("[v0] Login failed:", error.message);
        } else {
          console.error("[v0] Login error:", error.message);
        }
        return { success: false, error: error.message };
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
            userLoaded.current = true;
            currentUserId.current = createdProfile.id;
            return { success: true };
          }

          // Não foi possível criar profile, força logout para limpar sessão inválida
          await supabase.auth.signOut();
          setUser(null);
          userLoaded.current = false;
          currentUserId.current = null;
          return { success: false, error: "Falha ao criar perfil de usuário." };
        }

        if (profile) {
          const userRole = profile.role as UserRole;
          setUser({
            id: profile.id,
            name: profile.nome,
            email: profile.email,
            role: userRole,
          });
          userLoaded.current = true;
          currentUserId.current = profile.id;
          console.log(
            "[v0] Login complete - role:",
            userRole,
            "profile.role:",
            profile.role
          );
          return { success: true };
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
            userLoaded.current = true;
            currentUserId.current = createdProfile.id;
            console.log(
              "[v0] Profile created and login complete - role:",
              userRole
            );
            return { success: true };
          }

          console.error(
            "[v0] Failed to create profile, login aborted. Signing out."
          );
          await supabase.auth.signOut();
          setUser(null);
          userLoaded.current = false;
          currentUserId.current = null;
          return { success: false, error: "Falha ao processar login." };
        }
      }

      return { success: false, error: "Login com falha desconhecida." };
    } catch (error) {
      console.error("[v0] Login exception:", error);
      return { success: false, error: error instanceof Error ? error.message : "Erro inesperado no login." };
    }
  };

  const logout = async () => {
    try {
      // Limpar estado local primeiro
      setUser(null);
      userLoaded.current = false;
      currentUserId.current = null;

      // Aguardar signOut completar
      const { error } = await supabase.auth.signOut();

      if (error) {
        console.error("[v0] Logout error:", error);
      }

      // Limpar localStorage/cookies
      if (typeof window !== "undefined") {
        localStorage.clear();
        // Limpar cookies do Supabase
        document.cookie.split(";").forEach((c) => {
          document.cookie = c
            .replace(/^ +/, "")
            .replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/");
        });
      }
    } catch (error) {
      console.error("[v0] Logout exception:", error);
    }
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

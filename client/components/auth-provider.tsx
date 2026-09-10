"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import {
  UserProfile,
  loginApi,
  registerApi,
  getMeApi,
  logoutApi,
} from "@/lib/api/auth";
import { setAuthTokens, clearAuthTokens, getStoredTokens } from "@/lib/api/client";

interface AuthContextType {
  user: UserProfile | null;
  permissions: string[];
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (
    companyName: string,
    name: string,
    email: string,
    password: string
  ) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const PUBLIC_ROUTES = ["/", "/login", "/signup"];

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [permissions, setPermissions] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    let isMounted = true;

    const restoreSession = async () => {
      const { accessToken, refreshToken } = getStoredTokens();

      if (!accessToken && !refreshToken) {
        if (isMounted) setIsLoading(false);
        return;
      }

      try {
        const res = await getMeApi();
        if (isMounted) {
          setUser(res.user);
          setPermissions(res.permissions || []);
        }
      } catch {
        clearAuthTokens();
        if (isMounted) {
          setUser(null);
          setPermissions([]);
        }
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    restoreSession();

    return () => {
      isMounted = false;
    };
  }, []);

  const isAuthenticated = !!user;

  // Protected route & authenticated route redirection
  useEffect(() => {
    if (isLoading) return;

    const isPublic = PUBLIC_ROUTES.includes(pathname);

    if (!isAuthenticated && !isPublic && pathname.startsWith("/dashboard")) {
      router.push("/login");
    } else if (isAuthenticated && isPublic && (pathname === "/login" || pathname === "/signup")) {
      router.push("/dashboard");
    }
  }, [isAuthenticated, isLoading, pathname, router]);

  const login = async (email: string, password: string) => {
    const res = await loginApi({ email, password });
    setAuthTokens(res.accessToken, res.refreshToken);
    setUser(res.user);
    setPermissions(res.permissions || []);
    router.push("/dashboard");
  };

  const register = async (
    companyName: string,
    name: string,
    email: string,
    password: string
  ) => {
    const res = await registerApi({ companyName, name, email, password });
    setAuthTokens(res.accessToken, res.refreshToken);
    setUser(res.user);
    setPermissions(res.permissions || []);
    router.push("/dashboard");
  };

  const logout = async () => {
    try {
      await logoutApi();
    } catch {
      // Ignore logout api network errors and clear client session anyway
    } finally {
      clearAuthTokens();
      setUser(null);
      setPermissions([]);
      router.push("/login");
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        permissions,
        isAuthenticated,
        isLoading,
        login,
        register,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

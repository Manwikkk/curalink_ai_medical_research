import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { authApi, tokenStorage, type AuthUser } from "@/lib/api";

interface AuthContextValue {
  user: AuthUser | null;
  loading: boolean;
  isGuest: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  continueAsGuest: () => void;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [isGuest, setIsGuest] = useState(false);

  useEffect(() => {
    // Check for Google OAuth token in URL
    const urlParams = new URLSearchParams(window.location.search);
    const urlToken = urlParams.get("token");
    if (urlToken) {
      tokenStorage.set(urlToken);
      sessionStorage.removeItem("curalink_guest"); // Clear guest before init
      // Remove from URL cleanly
      const cleanUrl = window.location.pathname;
      window.history.replaceState({}, "", cleanUrl);
    }
    initAuth();
  }, []);

  async function initAuth() {
    // Check if user previously chose guest mode
    const guestMode = sessionStorage.getItem("curalink_guest");
    if (guestMode === "1") {
      setIsGuest(true);
      setLoading(false);
      return;
    }

    const token = tokenStorage.get();
    if (!token) {
      setLoading(false);
      return;
    }
    try {
      const { user } = await authApi.getMe();
      setUser(user);
      setIsGuest(false);
    } catch {
      tokenStorage.clear();
    } finally {
      setLoading(false);
    }
  }

  const login = useCallback(async (email: string, password: string) => {
    const { token, user } = await authApi.login(email, password);
    tokenStorage.set(token);
    sessionStorage.removeItem("curalink_guest");
    setIsGuest(false);
    setUser(user);
  }, []);

  const register = useCallback(async (name: string, email: string, password: string) => {
    const { token, user } = await authApi.register(name, email, password);
    tokenStorage.set(token);
    sessionStorage.removeItem("curalink_guest");
    setIsGuest(false);
    setUser(user);
  }, []);

  const continueAsGuest = useCallback(() => {
    sessionStorage.setItem("curalink_guest", "1");
    setIsGuest(true);
    setUser(null);
  }, []);

  const logout = useCallback(() => {
    tokenStorage.clear();
    sessionStorage.removeItem("curalink_guest");
    setUser(null);
    setIsGuest(false);
  }, []);

  const refreshUser = useCallback(async () => {
    const { user } = await authApi.getMe();
    setUser(user);
  }, []);

  return (
    <AuthContext.Provider
      value={{ user, loading, isGuest, login, register, continueAsGuest, logout, refreshUser }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

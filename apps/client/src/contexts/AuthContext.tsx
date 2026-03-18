import React, { createContext, useContext, useEffect, useState } from "react";
import { api, setAuthToken } from "../lib/api";

type User = { id: string; email: string; role: string; createdAt: string } | null;

const AuthContext = createContext<{
  user: User;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refetch: () => Promise<void>;
}>(null!);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User>(null);
  const [loading, setLoading] = useState(true);

  const refetch = async () => {
    try {
      const { user: u } = await api.auth.me();
      setUser(u);
    } catch {
      setAuthToken(null);
      setUser(null);
    }
  };

  useEffect(() => {
    refetch().finally(() => setLoading(false));
  }, []);

  const login = async (email: string, password: string) => {
    const { token, user: u } = await api.auth.login(email, password);
    setAuthToken(token);
    setUser(u);
  };

  const logout = async () => {
    await api.auth.logout();
    setAuthToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, refetch }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

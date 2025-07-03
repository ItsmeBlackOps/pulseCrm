/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useEffect, useState } from "react";

interface User {
  userid: number;
  name: string;
  email: string;
  roleid: number;
  status?: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  refreshTokenValue: string | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  fetchWithAuth: (input: RequestInfo, init?: RequestInit) => Promise<Response>;
  refreshToken: () => Promise<boolean>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [refreshTokenValue, setRefreshTokenValue] = useState<string | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem("auth");
    if (stored) {
      const { user, token, refreshToken } = JSON.parse(stored);
      setUser(user);
      setToken(token);
      setRefreshTokenValue(refreshToken || null);
    }
  }, []);

  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

  const login = async (email: string, password: string) => {
    const lower = email.toLowerCase();
    const res = await fetch(`${API_BASE_URL}/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: lower, password })
    });
    if (!res.ok) {
      throw new Error("Invalid credentials");
    }
    const data = await res.json();
    if (data.user?.status && data.user.status.toLowerCase() !== "active") {
      throw new Error("Account is disabled");
    }
    setUser(data.user);
    setToken(data.token);
    setRefreshTokenValue(data.refreshToken);
    localStorage.setItem(
      "auth",
      JSON.stringify({ user: data.user, token: data.token, refreshToken: data.refreshToken })
    );
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    setRefreshTokenValue(null);
    localStorage.removeItem("auth");
  };

  const fetchWithAuth = async (
    input: RequestInfo,
    init: RequestInit = {},
    retry = true
  ): Promise<Response> => {
    const headers = new Headers(init.headers);
    if (token) headers.set("Authorization", `Bearer ${token}`);
    const response = await fetch(input, { ...init, headers });
    if (response.status === 401 && retry) {
      const refreshed = await refreshToken();
      if (refreshed) {
        const retryHeaders = new Headers(init.headers);
        if (token) retryHeaders.set("Authorization", `Bearer ${token}`);
        const second = await fetch(input, { ...init, headers: retryHeaders });
        if (second.status === 401) logout();
        return second;
      }
      logout();
    }
    return response;
  };

  const refreshToken = async (): Promise<boolean> => {
    if (!refreshTokenValue) return false;
    try {
      const res = await fetch(`${API_BASE_URL}/refresh`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refreshToken: refreshTokenValue })
      });
      if (!res.ok) return false;
      const data = await res.json();
      setToken(data.token);
      setRefreshTokenValue(data.refreshToken ?? refreshTokenValue);
      localStorage.setItem(
        "auth",
        JSON.stringify({ user, token: data.token, refreshToken: data.refreshToken ?? refreshTokenValue })
      );
      return true;
    } catch {
      return false;
    }
  };

  const refreshUser = async () => {
    if (!token) return;
    const res = await fetchWithAuth(`${API_BASE_URL}/me`);
    if (res.ok) {
      const data = await res.json();
      setUser(data);
      localStorage.setItem(
        "auth",
        JSON.stringify({ user: data, token, refreshToken: refreshTokenValue })
      );
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        refreshTokenValue,
        login,
        logout,
        fetchWithAuth,
        refreshToken,
        refreshUser,
      }}
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

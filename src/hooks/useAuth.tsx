import { createContext, useContext, useEffect, useState } from "react";

interface User {
  userid: number;
  name: string;
  email: string;
  roleid: number;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  fetchWithAuth: (input: RequestInfo, init?: RequestInit) => Promise<Response>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem("auth");
    if (stored) {
      const { user, token } = JSON.parse(stored);
      setUser(user);
      setToken(token);
    }
  }, []);

  const login = async (email: string, password: string) => {
    const res = await fetch("/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password })
    });
    if (!res.ok) {
      throw new Error("Invalid credentials");
    }
    const data = await res.json();
    setUser(data.user);
    setToken(data.token);
    localStorage.setItem("auth", JSON.stringify({ user: data.user, token: data.token }));
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem("auth");
  };

  const fetchWithAuth = (input: RequestInfo, init: RequestInit = {}) => {
    const headers = new Headers(init.headers);
    if (token) headers.set("Authorization", `Bearer ${token}`);
    return fetch(input, { ...init, headers });
  };

  const refreshUser = async () => {
    if (!token) return;
    const res = await fetchWithAuth("/me");
    if (res.ok) {
      const data = await res.json();
      setUser(data);
      localStorage.setItem("auth", JSON.stringify({ user: data, token }));
    }
  };

  return (
    <AuthContext.Provider value={{ user, token, login, logout, fetchWithAuth, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

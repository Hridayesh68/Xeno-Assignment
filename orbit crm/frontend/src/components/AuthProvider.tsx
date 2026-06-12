"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { getMe, login as apiLogin, signup as apiSignup, User } from "@/lib/api";

interface AuthContextType {
  user: User | null;
  token: string | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, password: string, name?: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  const checkUser = async () => {
    if (typeof window === "undefined") return;
    const storedToken = localStorage.getItem("xeno_token");
    if (!storedToken) {
      setUser(null);
      setToken(null);
      setLoading(false);
      return;
    }

    try {
      setToken(storedToken);
      const userData = await getMe();
      setUser(userData);
    } catch (err) {
      console.error("Auth check failed:", err);
      localStorage.removeItem("xeno_token");
      setUser(null);
      setToken(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkUser();
  }, []);

  useEffect(() => {
    if (!loading) {
      const isAuthPage = pathname === "/login" || pathname === "/signup";
      if (!user && !isAuthPage) {
        router.push("/login");
      } else if (user && isAuthPage) {
        router.push("/");
      }
    }
  }, [user, loading, pathname, router]);

  const login = async (email: string, password: string) => {
    try {
      const res = await apiLogin({ email, password });
      localStorage.setItem("xeno_token", res.access_token);
      setToken(res.access_token);
      const userData = await getMe();
      setUser(userData);
      router.push("/");
    } catch (err) {
      throw err;
    }
  };

  const signup = async (email: string, password: string, name?: string) => {
    try {
      await apiSignup({ email, password, name });
      // Automatically log in after signup
      const res = await apiLogin({ email, password });
      localStorage.setItem("xeno_token", res.access_token);
      setToken(res.access_token);
      const userData = await getMe();
      setUser(userData);
      router.push("/");
    } catch (err) {
      throw err;
    }
  };

  const logout = () => {
    localStorage.removeItem("xeno_token");
    setUser(null);
    setToken(null);
    router.push("/login");
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, login, signup, logout }}>
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

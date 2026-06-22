import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { apiRequest, setUnauthorizedHandler } from "../api/client";

interface AuthContextValue {
  token: string | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const TOKEN_STORAGE_KEY = "access_token";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem(TOKEN_STORAGE_KEY));

  useEffect(() => {
    if (token) {
      localStorage.setItem(TOKEN_STORAGE_KEY, token);
    } else {
      localStorage.removeItem(TOKEN_STORAGE_KEY);
    }
  }, [token]);

  useEffect(() => {
    setUnauthorizedHandler(() => setToken(null));
    return () => setUnauthorizedHandler(null);
  }, []);

  async function login(email: string, password: string) {
    const data = await apiRequest<{ access_token: string }>("/auth/login", {
      method: "POST",
      json: { email, password },
    });
    setToken(data.access_token);
  }

  async function register(email: string, password: string) {
    await apiRequest("/auth/register", { method: "POST", json: { email, password } });
    await login(email, password);
  }

  function logout() {
    // The token is stateless and isn't blacklisted server-side, so logging out is really
    // just the client forgetting it. The API call is fire-and-forget, kept for symmetry.
    if (token) {
      apiRequest("/auth/logout", { method: "POST", token }).catch(() => {});
    }
    setToken(null);
  }

  const value: AuthContextValue = {
    token,
    isAuthenticated: token !== null,
    login,
    register,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
}

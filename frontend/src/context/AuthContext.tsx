import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { loginRequest, meRequest, registerRequest } from "../lib/api";
import type { AuthUser, UserRole } from "../types/auth";

interface AuthContextValue {
    user: AuthUser | null;
    token: string | null;
    loading: boolean;
    login: (email: string, password: string) => Promise<void>;
    register: (input: { name: string; email: string; password: string; role: UserRole }) => Promise<void>;
    logout: () => void;
}

const TOKEN_KEY = "vislides_token";
const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [token, setToken] = useState<string | null>(() => localStorage.getItem(TOKEN_KEY));
    const [user, setUser] = useState<AuthUser | null>(null);
    const [loading, setLoading] = useState(true);
    const hydratedTokenRef = useRef<string | null>(null);

    useEffect(() => {
        async function hydrateUser() {
            if (!token) {
                hydratedTokenRef.current = null;
                setLoading(false);
                return;
            }

            if (user && hydratedTokenRef.current !== token) {
                hydratedTokenRef.current = token;
                setLoading(false);
                return;
            }

            try {
                const currentUser = await meRequest(token);
                setUser(currentUser);
                hydratedTokenRef.current = token;
            } catch {
                localStorage.removeItem(TOKEN_KEY);
                setToken(null);
                setUser(null);
                hydratedTokenRef.current = null;
            } finally {
                setLoading(false);
            }
        }

        void hydrateUser();
    }, [token, user]);

    const login = useCallback(async (email: string, password: string) => {
        const response = await loginRequest({ email, password });
        localStorage.setItem(TOKEN_KEY, response.token);
        setToken(response.token);
        setUser(response.user);
    }, []);

    const register = useCallback(async (input: { name: string; email: string; password: string; role: UserRole }) => {
        const response = await registerRequest(input);
        localStorage.setItem(TOKEN_KEY, response.token);
        setToken(response.token);
        setUser(response.user);
    }, []);

    const logout = useCallback(() => {
        localStorage.removeItem(TOKEN_KEY);
        setToken(null);
        setUser(null);
    }, []);

    const value = useMemo(
        () => ({
            user,
            token,
            loading,
            login,
            register,
            logout
        }),
        [user, token, loading, login, register, logout]
    );

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error("useAuth must be used inside AuthProvider");
    }

    return context;
}

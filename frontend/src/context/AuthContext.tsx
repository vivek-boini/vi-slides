import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
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

    useEffect(() => {
        async function hydrateUser() {
            if (!token) {
                setLoading(false);
                return;
            }

            try {
                const currentUser = await meRequest(token);
                setUser(currentUser);
            } catch {
                localStorage.removeItem(TOKEN_KEY);
                setToken(null);
                setUser(null);
            } finally {
                setLoading(false);
            }
        }

        void hydrateUser();
    }, [token]);

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

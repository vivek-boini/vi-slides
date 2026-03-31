import type { AuthResponse, AuthUser, DashboardResponse, UserRole } from "../types/auth";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 
    (import.meta.env.DEV ? "http://localhost:5001/api" : "/api");

interface ApiRequestOptions extends RequestInit {
    token?: string | null;
}

async function apiRequest<T>(path: string, options: ApiRequestOptions = {}): Promise<T> {
    const { token, headers, ...rest } = options;

    const response = await fetch(`${API_BASE_URL}${path}`, {
        ...rest,
        headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
            ...headers
        }
    });

    const payload = await response.json().catch(() => ({}));

    if (!response.ok) {
        const validationMessage = Array.isArray(payload.errors) ? payload.errors[0]?.msg : undefined;
        throw new Error(payload.message ?? validationMessage ?? "Request failed");
    }

    return payload as T;
}

export function registerRequest(input: {
    name: string;
    email: string;
    password: string;
    role: UserRole;
}): Promise<AuthResponse> {
    return apiRequest<AuthResponse>("/auth/register", {
        method: "POST",
        body: JSON.stringify(input)
    });
}

export function loginRequest(input: { email: string; password: string }): Promise<AuthResponse> {
    return apiRequest<AuthResponse>("/auth/login", {
        method: "POST",
        body: JSON.stringify(input)
    });
}

export function forgotPasswordCheckEmailRequest(input: { email: string }): Promise<{ success: boolean; message: string }> {
    return apiRequest<{ success: boolean; message: string }>("/auth/forgot-password/check-email", {
        method: "POST",
        body: JSON.stringify(input)
    });
}

export function forgotPasswordResetRequest(input: { email: string; newPassword: string }): Promise<{ success: boolean; message: string }> {
    return apiRequest<{ success: boolean; message: string }>("/auth/forgot-password/reset", {
        method: "POST",
        body: JSON.stringify(input)
    });
}

export async function meRequest(token: string): Promise<AuthUser> {
    const response = await apiRequest<{ user: AuthUser }>("/auth/me", { token });
    return response.user;
}

export function dashboardRequest(role: UserRole, token: string): Promise<DashboardResponse> {
    return apiRequest<DashboardResponse>(`/dashboard/${role}`, { token });
}

// Session APIs
export interface SessionData {
    _id: string;
    title: string;
    description?: string;
    code: string;
    status: string;
    qrCodeDataUrl?: string;
    joinUrl?: string;
    createdAt: string;
}

export interface CreateSessionResponse {
    success: boolean;
    data: SessionData;
}

export interface JoinSessionResponse {
    success: boolean;
    data: SessionData;
}

export function createSessionRequest(
    input: { title: string; description?: string },
    token: string
): Promise<CreateSessionResponse> {
    return apiRequest<CreateSessionResponse>("/sessions", {
        method: "POST",
        body: JSON.stringify(input),
        token
    });
}

export function joinSessionRequest(
    input: { code: string },
    token: string
): Promise<JoinSessionResponse> {
    return apiRequest<JoinSessionResponse>("/sessions/join", {
        method: "POST",
        body: JSON.stringify(input),
        token
    });
}

export interface GetSessionResponse {
    success: boolean;
    data: SessionData;
}

export function getSessionRequest(
    code: string,
    token: string
): Promise<GetSessionResponse> {
    return apiRequest<GetSessionResponse>(`/sessions/${code}`, {
        method: "GET",
        token
    });
}

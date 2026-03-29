export type UserRole = "teacher" | "student";

export interface AuthUser {
    id: string;
    name: string;
    email: string;
    role: UserRole;
}

export interface AuthResponse {
    token: string;
    user: AuthUser;
}

export interface DashboardResponse {
    message: string;
    role: UserRole;
    metrics: Record<string, number>;
    actions: string[];
}

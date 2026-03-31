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

// Session types and API functions
export interface SessionData {
    _id: string;
    code: string;
    title: string;
    description?: string;
    teacher: string;
    status: "active" | "ended";
    createdAt: string;
    updatedAt?: string;
}

interface SessionResponse {
    success: boolean;
    data: SessionData;
}

interface CreateSessionResponse {
    success: boolean;
    data: SessionData;
}

export async function getSessionRequest(codeOrId: string, token: string): Promise<SessionData> {
    const response = await apiRequest<SessionResponse>(`/sessions/${codeOrId}`, { token });
    return response.data;
}

export async function createSessionRequest(
    input: { title: string; description?: string },
    token: string
): Promise<SessionData> {
    const response = await apiRequest<CreateSessionResponse>("/sessions", {
        method: "POST",
        token,
        body: JSON.stringify(input)
    });
    return response.data;
}

export async function joinSessionRequest(code: string, token: string): Promise<SessionData> {
    const response = await apiRequest<SessionResponse>("/sessions/join", {
        method: "POST",
        token,
        body: JSON.stringify({ code })
    });
    return response.data;
}

// Session Summary types and API
export interface SessionSummaryQuestion {
    _id: string;
    text: string;
    answer: string | null;
    studentName: string;
    createdAt: string;
}

export interface SessionSummary {
    sessionCode: string;
    title: string;
    description?: string;
    status: string;
    totalStudents: number;
    totalQuestions: number;
    questions: SessionSummaryQuestion[];
    moodSummary?: string;
    createdAt: string;
    endedAt?: string;
}

interface SessionSummaryResponse {
    success: boolean;
    data: SessionSummary;
}

export async function getSessionSummaryRequest(code: string, token: string): Promise<SessionSummary> {
    const response = await apiRequest<SessionSummaryResponse>(`/sessions/${code}/summary`, { token });
    return response.data;
}

export interface AssignmentTeacher {
    _id: string;
    name: string;
    email: string;
}

export interface AssignmentItem {
    _id: string;
    title: string;
    description: string;
    groupId: string;
    referenceUrl?: string | null;
    maxMarks: number;
    deadline: string;
    status: "active" | "closed";
    teacher?: AssignmentTeacher;
    createdAt?: string;
    updatedAt?: string;
}

interface AssignmentListResponse {
    success: boolean;
    data: AssignmentItem[];
}

interface AssignmentDetailResponse {
    success: boolean;
    data: AssignmentItem;
}

interface SubmissionResponse {
    success: boolean;
    data: unknown;
}

interface CreateAssignmentResponse {
    success: boolean;
    data: AssignmentItem;
}

export interface SubmissionStudent {
    _id: string;
    name: string;
    email: string;
}

export interface SubmissionItem {
    _id: string;
    assignment: string | AssignmentItem;
    student: SubmissionStudent;
    submissionText: string;
    pdfUrl?: string | null;
    marksObtained?: number | null;
    feedback?: string;
    status: "pending" | "submitted" | "graded";
    isLate: boolean;
    createdAt?: string;
    updatedAt?: string;
}

interface SubmissionListResponse {
    success: boolean;
    data: SubmissionItem[];
}

interface JoinGroupResponse {
    success: boolean;
    message: string;
}

export async function getAssignmentsRequest(token: string, groupId?: string): Promise<AssignmentItem[]> {
    const suffix = groupId ? `?groupId=${encodeURIComponent(groupId.trim().toUpperCase())}` : "";
    const response = await apiRequest<AssignmentListResponse>(`/assignments${suffix}`, { token });
    return response.data;
}

export async function getAssignmentByIdRequest(id: string, token: string): Promise<AssignmentItem> {
    const response = await apiRequest<AssignmentDetailResponse>(`/assignments/${id}`, { token });
    return response.data;
}

export function submitAssignmentRequest(
    input: { assignmentId: string; submissionText: string; pdfUrl?: string },
    token: string
): Promise<SubmissionResponse> {
    return apiRequest<SubmissionResponse>("/submissions", {
        method: "POST",
        token,
        body: JSON.stringify(input)
    });
}

export async function createAssignmentRequest(
    input: { title: string; description: string; groupId: string; referenceUrl?: string; maxMarks: number; deadline: string },
    token: string
): Promise<AssignmentItem> {
    const response = await apiRequest<CreateAssignmentResponse>("/assignments", {
        method: "POST",
        token,
        body: JSON.stringify(input)
    });
    return response.data;
}

export async function getSubmissionsByAssignmentRequest(assignmentId: string, token: string): Promise<SubmissionItem[]> {
    const response = await apiRequest<SubmissionListResponse>(`/submissions/assignment/${assignmentId}`, { token });
    return response.data;
}

export async function joinAssignmentGroupRequest(groupId: string, token: string): Promise<string> {
    const response = await apiRequest<JoinGroupResponse>("/assignments/join-group", {
        method: "POST",
        token,
        body: JSON.stringify({ groupId })
    });
    return response.message;
}

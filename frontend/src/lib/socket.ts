import { io, Socket } from "socket.io-client";

// Socket.io server URL - use same base as API but without /api
const SOCKET_URL = import.meta.env.VITE_API_BASE_URL?.replace("/api", "") ?? 
    (import.meta.env.DEV ? "http://localhost:5001" : "");

// Singleton socket instance
let socket: Socket | null = null;

export function getSocket(): Socket {
    if (!socket) {
        socket = io(SOCKET_URL, {
            autoConnect: false,
            transports: ["websocket", "polling"]
        });
    }
    return socket;
}

export function connectSocket(): Socket {
    const s = getSocket();
    if (!s.connected) {
        s.connect();
    }
    return s;
}

export function disconnectSocket(): void {
    if (socket?.connected) {
        socket.disconnect();
    }
}

// Question type for real-time updates
export interface Question {
    _id: string;
    content: string;
    user?: {
        _id: string;
        name: string;
    };
    createdAt: string;
    upvotes?: string[];
    isPinned?: boolean;
    teacherAnswer?: string;
}

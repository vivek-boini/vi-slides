declare namespace Express {
    interface Request {
        user?: {
            id: string;
            role: "teacher" | "student";
            email: string;
            name: string;
        };
    }
}

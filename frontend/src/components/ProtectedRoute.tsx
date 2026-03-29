import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import type { UserRole } from "../types/auth";

interface ProtectedRouteProps {
    role?: UserRole;
}

function ProtectedRoute({ role }: ProtectedRouteProps) {
    const { user, loading } = useAuth();
    const location = useLocation();

    if (loading) {
        return <div className="centered-loader">Loading your workspace...</div>;
    }

    if (!user) {
        return <Navigate to="/login" state={{ from: location }} replace />;
    }

    if (role && user.role !== role) {
        const fallback = user.role === "teacher" ? "/teacher/dashboard" : "/student/dashboard";
        return <Navigate to={fallback} replace />;
    }

    return <Outlet />;
}

export default ProtectedRoute;

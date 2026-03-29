import { Link, Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

function LandingPage() {
    const { user } = useAuth();

    if (user) {
        return <Navigate to={user.role === "teacher" ? "/teacher/dashboard" : "/student/dashboard"} replace />;
    }

    return (
        <section className="landing">
            <div className="glass-card hero-card">
                <p className="kicker">Adaptive Classroom Platform</p>
                <h1>Question-driven teaching with secure role-based workspaces.</h1>
                <p>
                    Launch sessions, analyze student curiosity, and route discussion with a modern MERN foundation ready for scale.
                </p>
                <div className="hero-actions">
                    <Link to="/register" className="solid-btn">
                        Create Account
                    </Link>
                    <Link to="/login" className="ghost-btn large">
                        Sign In
                    </Link>
                </div>
            </div>
        </section>
    );
}

export default LandingPage;

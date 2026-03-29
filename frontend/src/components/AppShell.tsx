import { Link, NavLink, Outlet } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

function AppShell() {
    const { user, logout } = useAuth();
    const userInitial = user?.name?.charAt(0).toUpperCase() ?? "U";

    return (
        <div className="app-shell">
            <header className="topbar glass-card">
                <Link to="/" className="brand">
                    <span className="brand-pill">Vi</span>
                    <span>SlideS</span>
                </Link>

                <nav className="topbar-nav">
                    {user?.role === "teacher" && (
                        <NavLink to="/teacher/dashboard" className="topbar-link">
                            Teacher Hub
                        </NavLink>
                    )}
                    {user?.role === "student" && (
                        <NavLink to="/student/dashboard" className="topbar-link">
                            Student Hub
                        </NavLink>
                    )}
                </nav>

                <div className="topbar-user">
                    <div className="avatar-circle">{userInitial}</div>
                    <div>
                        <p>{user?.name}</p>
                        <small>{user?.role}</small>
                    </div>
                    <button type="button" className="ghost-btn" onClick={logout}>
                        Log out
                    </button>
                </div>
            </header>

            <main className="page-content">
                <Outlet />
            </main>
        </div>
    );
}

export default AppShell;

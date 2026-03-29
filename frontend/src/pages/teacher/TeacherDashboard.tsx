import { useEffect, useState } from "react";
import { dashboardRequest } from "../../lib/api";
import { useAuth } from "../../context/AuthContext";
import type { DashboardResponse } from "../../types/auth";

function TeacherDashboard() {
    const { token, user } = useAuth();
    const [data, setData] = useState<DashboardResponse | null>(null);
    const [error, setError] = useState("");

    useEffect(() => {
        async function loadDashboard() {
            if (!token) {
                return;
            }

            try {
                const payload = await dashboardRequest("teacher", token);
                setData(payload);
            } catch (err) {
                setError(err instanceof Error ? err.message : "Failed to load dashboard");
            }
        }

        void loadDashboard();
    }, [token]);

    if (error) {
        return <p className="form-error">{error}</p>;
    }

    if (!data) {
        return <p>Loading teacher dashboard...</p>;
    }

    return (
        <section className="dashboard-screen">
            <header className="glass-card hero-strip">
                <p className="kicker">Teacher Dashboard</p>
                <h2>{data.message}</h2>
                <p>Plan, run, and adapt live sessions in one place.</p>
            </header>

            <div className="metric-grid">
                <article className="glass-card metric-card">
                    <h3>{data.metrics.activeSessions}</h3>
                    <p>Active Sessions</p>
                </article>
                <article className="glass-card metric-card">
                    <h3>{data.metrics.sessionsConducted}</h3>
                    <p>Sessions Conducted</p>
                </article>
                <article className="glass-card metric-card">
                    <h3>{data.metrics.totalStudents}</h3>
                    <p>Total Students</p>
                </article>
            </div>

            <article className="glass-card action-board">
                <h3>Priority Actions</h3>
                <ul>
                    {data.actions.map((action) => (
                        <li key={action}>{action}</li>
                    ))}
                </ul>
                <p className="footnote">Signed in as {user?.email}</p>
            </article>
        </section>
    );
}

export default TeacherDashboard;

import { useEffect, useState } from "react";
import { dashboardRequest } from "../../lib/api";
import { useAuth } from "../../context/AuthContext";
import type { DashboardResponse } from "../../types/auth";

function StudentDashboard() {
    const { token, user } = useAuth();
    const [data, setData] = useState<DashboardResponse | null>(null);
    const [error, setError] = useState("");

    useEffect(() => {
        async function loadDashboard() {
            if (!token) {
                return;
            }

            try {
                const payload = await dashboardRequest("student", token);
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
        return <p>Loading student dashboard...</p>;
    }

    return (
        <section className="dashboard-screen">
            <header className="glass-card hero-strip">
                <p className="kicker">Student Dashboard</p>
                <h2>{data.message}</h2>
                <p>Join sessions, ask meaningful questions, and track your learning journey.</p>
            </header>

            <div className="metric-grid">
                <article className="glass-card metric-card">
                    <h3>{data.metrics.sessionsJoined}</h3>
                    <p>Sessions Joined</p>
                </article>
                <article className="glass-card metric-card">
                    <h3>{data.metrics.questionsAsked}</h3>
                    <p>Questions Asked</p>
                </article>
                <article className="glass-card metric-card">
                    <h3>{data.metrics.pendingResponses}</h3>
                    <p>Pending Responses</p>
                </article>
            </div>

            <article className="glass-card action-board">
                <h3>Quick Actions</h3>
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

export default StudentDashboard;

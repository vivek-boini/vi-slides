import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import type { UserRole } from "../types/auth";

function RegisterPage() {
    const { register } = useAuth();
    const navigate = useNavigate();

    const [form, setForm] = useState({
        name: "",
        email: "",
        password: "",
        role: "teacher" as UserRole
    });
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState("");

    async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault();
        setError("");
        setSubmitting(true);

        try {
            await register(form);
            navigate("/", { replace: true });
        } catch (err) {
            setError(err instanceof Error ? err.message : "Unable to create account");
        } finally {
            setSubmitting(false);
        }
    }

    return (
        <section className="auth-grid">
            <article className="glass-card auth-copy">
                <p className="kicker">Create Account</p>
                <h2>Start with a secure role-based profile</h2>
                <p>Pick your role once, and your dashboard adapts instantly after sign-up.</p>
            </article>

            <article className="glass-card auth-form-card">
                <h3>Register</h3>
                <form onSubmit={handleSubmit} className="auth-form">
                    <label>
                        Full Name
                        <input
                            type="text"
                            value={form.name}
                            onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
                            required
                            minLength={2}
                        />
                    </label>
                    <label>
                        Email
                        <input
                            type="email"
                            value={form.email}
                            onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))}
                            required
                        />
                    </label>
                    <label>
                        Password
                        <input
                            type="password"
                            value={form.password}
                            onChange={(e) => setForm((prev) => ({ ...prev, password: e.target.value }))}
                            required
                            minLength={8}
                        />
                    </label>
                    <label>
                        Role
                        <select
                            value={form.role}
                            onChange={(e) => setForm((prev) => ({ ...prev, role: e.target.value as UserRole }))}
                        >
                            <option value="teacher">Teacher</option>
                            <option value="student">Student</option>
                        </select>
                    </label>

                    {error && <p className="form-error">{error}</p>}

                    <button className="solid-btn" type="submit" disabled={submitting}>
                        {submitting ? "Creating account..." : "Create Account"}
                    </button>
                </form>

                <p className="switch-auth">
                    Already registered? <Link to="/login">Sign in</Link>
                </p>
            </article>
        </section>
    );
}

export default RegisterPage;

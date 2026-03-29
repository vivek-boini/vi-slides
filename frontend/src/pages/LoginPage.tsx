import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

function LoginPage() {
    const { login } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const from = (location.state as { from?: { pathname?: string } } | null)?.from?.pathname;

    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState("");

    async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault();
        setError("");
        setSubmitting(true);

        try {
            await login(email, password);
            navigate(from ?? "/", { replace: true });
        } catch (err) {
            setError(err instanceof Error ? err.message : "Unable to sign in");
        } finally {
            setSubmitting(false);
        }
    }

    return (
        <section className="auth-grid">
            <article className="glass-card auth-copy">
                <p className="kicker">Welcome Back</p>
                <h2>Sign in to your Vi-SlideS workspace</h2>
                <p>Teachers manage sessions. Students join discussions. One secure account flow for both roles.</p>
            </article>

            <article className="glass-card auth-form-card">
                <h3>Log In</h3>
                <form onSubmit={handleSubmit} className="auth-form">
                    <label>
                        Email
                        <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
                    </label>
                    <label>
                        Password
                        <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={8} />
                    </label>

                    {error && <p className="form-error">{error}</p>}

                    <button className="solid-btn" type="submit" disabled={submitting}>
                        {submitting ? "Signing in..." : "Log In"}
                    </button>
                </form>

                <p className="switch-auth">
                    New here? <Link to="/register">Create an account</Link>
                </p>
            </article>
        </section>
    );
}

export default LoginPage;

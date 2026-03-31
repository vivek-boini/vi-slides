import { useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import logo from "../assets/logo.png";
import { forgotPasswordCheckEmailRequest, forgotPasswordResetRequest } from "../lib/api";

function LoginPage() {
    const { login } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const from = (location.state as { from?: { pathname?: string } } | null)?.from?.pathname;

    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState("");
    const [message, setMessage] = useState("");
    const [forgotMode, setForgotMode] = useState(false);
    const [emailVerified, setEmailVerified] = useState(false);

    // Set page title
    useEffect(() => {
        document.title = 'Login - Vi-Slides';
    }, []);

    async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault();
        setError("");
        setMessage("");
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

    async function handleForgotCheckEmail(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault();
        setError("");
        setMessage("");
        setSubmitting(true);

        try {
            const response = await forgotPasswordCheckEmailRequest({ email });
            setMessage(response.message);
            setEmailVerified(true);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Unable to check email");
        } finally {
            setSubmitting(false);
        }
    }

    async function handleForgotResetPassword(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault();
        setError("");
        setMessage("");
        setSubmitting(true);

        try {
            const response = await forgotPasswordResetRequest({ email, newPassword });
            setMessage(response.message);
            setForgotMode(false);
            setEmailVerified(false);
            setNewPassword("");
        } catch (err) {
            setError(err instanceof Error ? err.message : "Unable to reset password");
        } finally {
            setSubmitting(false);
        }
    }

    function switchToForgotMode() {
        setForgotMode(true);
        setEmailVerified(false);
        setPassword("");
        setNewPassword("");
        setError("");
        setMessage("");
    }

    function switchToLoginMode() {
        setForgotMode(false);
        setEmailVerified(false);
        setNewPassword("");
        setError("");
        setMessage("");
    }

    return (
        <section className="auth-grid">
            <article className="auth-copy auth-orange">
                <img src={logo} alt="Vi-SlideS" className="auth-logo" />
                <p className="kicker">Welcome Back</p>
                <h2>Sign in to your Vi-SlideS workspace</h2>
                <p>Teachers manage sessions. Students join discussions. One secure account flow for both roles.</p>
            </article>

            <article className="auth-form-card auth-teal">
                <h3>{forgotMode ? "Forgot Password" : "Log In"}</h3>

                {!forgotMode && (
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
                        {message && <p className="form-success">{message}</p>}

                        <button className="solid-btn" type="submit" disabled={submitting}>
                            {submitting ? "Signing in..." : "Log In"}
                        </button>
                    </form>
                )}

                {forgotMode && !emailVerified && (
                    <form onSubmit={handleForgotCheckEmail} className="auth-form">
                        <label>
                            Email
                            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
                        </label>

                        {error && <p className="form-error">{error}</p>}
                        {message && <p className="form-success">{message}</p>}

                        <button className="solid-btn" type="submit" disabled={submitting}>
                            {submitting ? "Checking..." : "Continue"}
                        </button>
                    </form>
                )}

                {forgotMode && emailVerified && (
                    <form onSubmit={handleForgotResetPassword} className="auth-form">
                        <label>
                            New Password
                            <input
                                type="password"
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                                required
                                minLength={6}
                            />
                        </label>

                        {error && <p className="form-error">{error}</p>}
                        {message && <p className="form-success">{message}</p>}

                        <button className="solid-btn" type="submit" disabled={submitting}>
                            {submitting ? "Updating..." : "Update Password"}
                        </button>
                    </form>
                )}

                {!forgotMode && (
                    <p className="switch-auth">
                        New here? <Link to="/register">Create an account</Link>
                    </p>
                )}

                <p className="switch-auth">
                    {!forgotMode ? (
                        <button type="button" className="text-link-btn" onClick={switchToForgotMode}>
                            Forgot password?
                        </button>
                    ) : (
                        <button type="button" className="text-link-btn" onClick={switchToLoginMode}>
                            Back to login
                        </button>
                    )}
                </p>
            </article>
        </section>
    );
}

export default LoginPage;

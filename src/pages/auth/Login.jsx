import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { DEV_AUTH_BYPASS } from "../../config/devAccess";
import { useAuth } from "../../hooks/useAuth";
import { loginUser } from "../../services/authService";

function Login() {
  const navigate = useNavigate();
  const { loadUser } = useAuth();
  const [form, setForm] = useState({ email: "", password: "" });
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  function updateField(e) {
    setForm({ ...form, [e.target.name]: e.target.value });
  }

  async function handleLogin(e) {
    e.preventDefault();
    setLoading(true);
    setMessage("");

    try {
      if (!DEV_AUTH_BYPASS) {
        await loginUser(form.email, form.password);
        await loadUser();
      }

      navigate("/dashboard", { replace: true });
    } catch (error) {
      setMessage(error.message || "Unable to login. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-page">
      <form className="auth-card" onSubmit={handleLogin}>
        <h1>VARDHAN ERP</h1>
        <p>Smart Software. Simple Management.</p>
        <h2>Login</h2>

        {message && <div className="alert">{message}</div>}

        <input
          name="email"
          value={form.email}
          onChange={updateField}
          type="email"
          placeholder="Email address"
          required={!DEV_AUTH_BYPASS}
        />
        <input
          name="password"
          value={form.password}
          onChange={updateField}
          type="password"
          placeholder="Password"
          required={!DEV_AUTH_BYPASS}
        />

        <button disabled={loading}>{loading ? "Please wait..." : "Login"}</button>

        <div className="auth-links">
          <Link to="/forgot-password">Forgot Password?</Link>
          <span> | </span>
          <Link to="/register">Create Account</Link>
        </div>
      </form>
    </div>
  );
}

export default Login;

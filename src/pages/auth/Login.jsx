import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { DEV_AUTH_BYPASS } from "../../config/devAccess";
import { useAuth } from "../../hooks/useAuth";

const DEMO_AUTH_STORAGE_KEY = "vardhan.demo.auth.session.v1";
const DEMO_EMAIL = "admin@vardhan.com";
const DEMO_PASSWORD = "admin123";
const DEMO_AUTH_STATE = {
  isAuthenticated: true,
  email: DEMO_EMAIL,
  role: "PLATFORM_OWNER",
  tenant_id: "platform-owner",
  data_scope: "platform_owner",
};

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
      const email = form.email.trim().toLowerCase();

      if (email !== DEMO_EMAIL || form.password !== DEMO_PASSWORD) {
        setMessage("Invalid demo credentials");
        return;
      }

      window.localStorage.setItem(DEMO_AUTH_STORAGE_KEY, JSON.stringify(DEMO_AUTH_STATE));
      await loadUser();
      navigate("/dashboard", { replace: true });
    } catch (error) {
      setMessage("Invalid demo credentials");
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

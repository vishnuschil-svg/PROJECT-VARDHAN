import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { loginUser } from "../../services/authService";

function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleLogin(e) {
    e.preventDefault();
    setLoading(true);
    setMessage("");

    try {
      await loginUser(email, password);
      navigate("/dashboard");
    } catch (error) {
      setMessage(error.message);
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

        <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" placeholder="Email address" required />
        <input value={password} onChange={(e) => setPassword(e.target.value)} type="password" placeholder="Password" required />

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

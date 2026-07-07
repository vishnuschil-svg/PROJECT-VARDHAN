import { Link } from "react-router-dom";

function Login() {
  return (
    <div className="auth-page">
      <div className="auth-card">
        <h1>VARDHAN ERP</h1>
        <p>Smart Software. Simple Management.</p>
        <h2>Login</h2>

        <input type="email" placeholder="Email address" />
        <input type="password" placeholder="Password" />

        <button>Login</button>

        <div className="auth-links">
          <Link to="/forgot-password">Forgot Password?</Link>
          <span> | </span>
          <Link to="/register">Create Account</Link>
        </div>
      </div>
    </div>
  );
}

export default Login;

import { Link } from "react-router-dom";

function ForgotPassword() {
  return (
    <div className="auth-page">
      <div className="auth-card">
        <h1>VARDHAN ERP</h1>
        <h2>Forgot Password</h2>

        <input type="email" placeholder="Enter registered email" />
        <button>Send Reset Link</button>

        <div className="auth-links">
          <Link to="/login">Back to Login</Link>
        </div>
      </div>
    </div>
  );
}

export default ForgotPassword;
